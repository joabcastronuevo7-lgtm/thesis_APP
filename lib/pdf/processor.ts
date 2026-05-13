import pdfParse from "pdf-parse";
import { embedTexts, upsertVectors } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// Chunking configuration
// ============================================================
const CHUNK_SIZE = 1000;       // characters per chunk
const CHUNK_OVERLAP = 200;     // overlap between chunks
const MIN_CHUNK_SIZE = 100;    // discard chunks shorter than this

// ============================================================
// Extract text from PDF buffer
// ============================================================
export async function extractTextFromPDF(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
}> {
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    pageCount: data.numpages,
  };
}

// ============================================================
// Clean extracted text
// ============================================================
export function cleanText(text: string): string {
  return text
    .replace(/\f/g, "\n")                    // form feeds → newlines
    .replace(/\r\n/g, "\n")                  // CRLF → LF
    .replace(/[ \t]+/g, " ")                 // collapse whitespace
    .replace(/\n{3,}/g, "\n\n")              // collapse excessive newlines
    .replace(/[^\x20-\x7E\n]/g, " ")        // remove non-printable chars
    .trim();
}

// ============================================================
// Split text into overlapping chunks
// ============================================================
export interface TextChunk {
  content: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
}

export function splitIntoChunks(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE;

    // Try to break at a sentence or paragraph boundary
    if (end < text.length) {
      const nextParagraph = text.indexOf("\n\n", end - 100);
      const nextSentence = text.indexOf(". ", end - 100);
      if (nextParagraph !== -1 && nextParagraph < end + 200) {
        end = nextParagraph + 2;
      } else if (nextSentence !== -1 && nextSentence < end + 100) {
        end = nextSentence + 2;
      }
    }

    const content = text.slice(start, Math.min(end, text.length)).trim();

    if (content.length >= MIN_CHUNK_SIZE) {
      chunks.push({
        content,
        chunkIndex: index++,
        startChar: start,
        endChar: Math.min(end, text.length),
      });
    }

    start = Math.max(start + 1, end - CHUNK_OVERLAP);
  }

  return chunks;
}

// ============================================================
// Full PDF processing pipeline
// ============================================================
export interface ProcessingResult {
  pageCount: number;
  chunksCreated: number;
  vectorsStored: number;
}

export async function processPDF(
  pdfId: string,
  buffer: Buffer
): Promise<ProcessingResult> {
  // 1. Extract text
  const { text, pageCount } = await extractTextFromPDF(buffer);
  const cleanedText = cleanText(text);

  // 2. Chunk text
  const textChunks = splitIntoChunks(cleanedText);

  if (textChunks.length === 0) {
    throw new Error("No text content extracted from PDF");
  }

  // 3. Generate embeddings via Pinecone inference (llama-text-embed-v2)
  const contents = textChunks.map((c) => c.content);
  const embeddings = await embedTexts(contents);

  const globalTopics: string[] = [];
  const globalKeywords: string[] = [];

  // 4. Persist chunks to database & prepare Pinecone records
  const vectorRecords = [];
  const chunkRecords = [];

  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i];
    const embedding = embeddings[i];
    const vectorId = uuidv4();

    chunkRecords.push({
      pdfId,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      tokenCount: Math.ceil(chunk.content.length / 4),
      vectorId,
      topics: globalTopics.slice(0, 5),
      keywords: globalKeywords.slice(0, 10),
      embedding,
    });

    vectorRecords.push({
      id: vectorId,
      values: embedding,
      metadata: {
        pdfId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content.slice(0, 500), // Pinecone metadata limit
        topics: globalTopics.slice(0, 5),
        keywords: globalKeywords.slice(0, 10),
      },
    });
  }

  // 6. Bulk insert chunks into DB
  await prisma.extractedChunk.createMany({ data: chunkRecords });

  // 7. Upsert vectors into Pinecone
  await upsertVectors(vectorRecords);

  // 8. Update PDF record with page count and status
  await prisma.pDF.update({
    where: { id: pdfId },
    data: {
      status: "PROCESSED",
      pageCount,
      metadata: {
        globalTopics,
        globalKeywords,
        chunksCount: textChunks.length,
      },
    },
  });

  return {
    pageCount,
    chunksCreated: textChunks.length,
    vectorsStored: vectorRecords.length,
  };
}
