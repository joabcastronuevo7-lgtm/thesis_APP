import { Pinecone } from "@pinecone-database/pinecone";
import { prisma } from "@/lib/db";
import type { RetrievedChunk } from "@/types";

const EMBEDDING_MODEL =
  process.env.PINECONE_EMBEDDING_MODEL ?? "llama-text-embed-v2";

// Lazy-initialized singleton
let pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

function getPineconeIndex() {
  const client = getPineconeClient();
  return client.index(process.env.PINECONE_INDEX_NAME ?? "examgen-vectors");
}

// ============================================================
// Embed a single text string via Pinecone inference
// ============================================================
export async function embedText(text: string): Promise<number[]> {
  const client = getPineconeClient();
  const result = await client.inference.embed(EMBEDDING_MODEL, [text], {
    inputType: "query",
    truncate: "END",
  });
  const embedding = result.get(0);
  if (!embedding?.values) throw new Error("Pinecone inference returned no values");
  return embedding.values;
}

// ============================================================
// Embed multiple texts in batch via Pinecone inference
// ============================================================
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getPineconeClient();
  const result = await client.inference.embed(EMBEDDING_MODEL, texts, {
    inputType: "passage",
    truncate: "END",
  });
  return texts.map((_, i) => {
    const embedding = result.get(i);
    if (!embedding?.values) throw new Error(`Pinecone inference missing values at index ${i}`);
    return embedding.values;
  });
}

// ============================================================
// Upsert vectors into Pinecone
// ============================================================
export interface VectorRecord {
  id: string;       // chunk ID
  values: number[];
  metadata: {
    pdfId: string;
    chunkIndex: number;
    content: string;
    topics: string[];
    keywords: string[];
    pageNumber?: number;
  };
}

export async function upsertVectors(records: VectorRecord[]): Promise<void> {
  const index = getPineconeIndex();

  // Pinecone recommends batches of 100
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await index.upsert(batch);
  }
}

// ============================================================
// Query Pinecone for similar vectors
// ============================================================
export async function queryVectors(
  queryEmbedding: number[],
  topK: number = 5,
  filter?: Record<string, unknown>
): Promise<RetrievedChunk[]> {
  const index = getPineconeIndex();

  const result = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter,
  });

  const matches = result.matches ?? [];
  const vectorIds = matches.map((match) => match.id);
  const dbChunks = await prisma.extractedChunk.findMany({
    where: { vectorId: { in: vectorIds } },
    select: {
      id: true,
      vectorId: true,
      content: true,
      topics: true,
      keywords: true,
      pdfId: true,
      chunkIndex: true,
    },
  });
  const chunksByVectorId = new Map(
    dbChunks
      .filter((chunk) => chunk.vectorId)
      .map((chunk) => [chunk.vectorId as string, chunk])
  );

  return matches
    .map((match) => {
      const dbChunk = chunksByVectorId.get(match.id);
      if (!dbChunk) return null;

      return {
        id: dbChunk.id,
        content: dbChunk.content || ((match.metadata?.content as string) ?? ""),
        score: match.score ?? 0,
        topics: dbChunk.topics,
        keywords: dbChunk.keywords,
        pdfId: dbChunk.pdfId,
        chunkIndex: dbChunk.chunkIndex,
      };
    })
    .filter((chunk): chunk is RetrievedChunk => chunk !== null);
}

// ============================================================
// Delete vectors for a PDF (when PDF is removed)
// ============================================================
export async function deleteVectorsByPdfId(pdfId: string): Promise<void> {
  // Use DB-stored vectorIds — avoids a dimension-specific zero-vector query
  const chunks = await prisma.extractedChunk.findMany({
    where: { pdfId },
    select: { vectorId: true },
  });

  const ids = chunks.map((c) => c.vectorId).filter((id): id is string => id !== null);
  if (ids.length === 0) return;

  const index = getPineconeIndex();
  const BATCH = 1000;
  for (let i = 0; i < ids.length; i += BATCH) {
    await index.deleteMany(ids.slice(i, i + BATCH));
  }
}

// ============================================================
// Delete specific vector IDs
// ============================================================
export async function deleteVectors(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const index = getPineconeIndex();
  await index.deleteMany(ids);
}
