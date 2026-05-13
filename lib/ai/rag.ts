import { embedText, queryVectors } from "./embeddings";
import { prisma } from "@/lib/db";
import type { RetrievedChunk, RAGContext } from "@/types";

// ============================================================
// Core retrieval: embed a query and fetch top-k similar chunks
// ============================================================
export async function retrieveRelevantChunks(
  query: string,
  pdfIds: string[],
  topK: number = 5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);

  // Build Pinecone metadata filter to scope retrieval to specific PDFs
  const filter =
    pdfIds.length > 0
      ? { pdfId: { $in: pdfIds } }
      : undefined;

  const chunks = await queryVectors(queryEmbedding, topK, filter);

  // Enrich with any DB-stored data (fallback if vector store lacks content)
  const enriched = await Promise.all(
    chunks.map(async (chunk) => {
      if (!chunk.content) {
        const dbChunk = await prisma.extractedChunk.findUnique({
          where: { id: chunk.id },
        });
        if (dbChunk) {
          return {
            ...chunk,
            content: dbChunk.content,
            topics: dbChunk.topics,
            keywords: dbChunk.keywords,
            pdfId: dbChunk.pdfId,
          };
        }
      }
      return chunk;
    })
  );

  return enriched.filter((c) => c.content.length > 0);
}

// ============================================================
// Build RAG context for question generation
// ============================================================
export async function buildRAGContext(
  topic: string,
  pdfIds: string[],
  topK: number = 6
): Promise<RAGContext> {
  const chunks = await retrieveRelevantChunks(topic, pdfIds, topK);

  return {
    chunks,
    query: topic,
    pdfIds,
  };
}

// ============================================================
// Retrieve diverse chunks covering multiple topics
// Useful for generating a balanced quiz across the entire PDF
// ============================================================
export async function retrieveDiverseChunks(
  pdfIds: string[],
  numTopics: number = 5,
  chunksPerTopic: number = 3
): Promise<RetrievedChunk[]> {
  // Fetch distinct topics stored in the chunks for these PDFs
  const chunkMeta = await prisma.extractedChunk.findMany({
    where: { pdfId: { in: pdfIds } },
    select: { topics: true, id: true },
    distinct: ["topics"],
    take: numTopics * 5,
  });

  const allTopics = new Set<string>();
  chunkMeta.forEach((c) => c.topics.forEach((t) => allTopics.add(t)));
  const topics = Array.from(allTopics).slice(0, numTopics);

  if (topics.length === 0) {
    // Fallback: retrieve generic chunks
    return retrieveRelevantChunks(
      "main concepts",
      pdfIds,
      numTopics * chunksPerTopic
    );
  }

  const results = await Promise.all(
    topics.map((topic) => retrieveRelevantChunks(topic, pdfIds, chunksPerTopic))
  );

  // Deduplicate by chunk ID
  const seen = new Set<string>();
  const unique: RetrievedChunk[] = [];
  for (const batch of results) {
    for (const chunk of batch) {
      if (!seen.has(chunk.id)) {
        seen.add(chunk.id);
        unique.push(chunk);
      }
    }
  }

  return unique;
}

// ============================================================
// Hallucination check: verify a statement against retrieved chunks
// Returns a confidence score 0-1
// ============================================================
export function validateAnswerAgainstChunks(
  answer: string,
  chunks: RetrievedChunk[]
): number {
  const combined = chunks.map((c) => c.content).join(" ").toLowerCase();
  const answerWords = answer
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);

  if (answerWords.length === 0) return 0;

  const matches = answerWords.filter((word) => combined.includes(word));
  return matches.length / answerWords.length;
}
