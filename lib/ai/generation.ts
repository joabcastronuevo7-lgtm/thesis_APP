import OpenAI from "openai";
import type { GeneratedQuestion, RetrievedChunk } from "@/types";
import { QuestionType, Difficulty } from "@prisma/client";
import { validateAnswerAgainstChunks } from "./rag";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const OPENAI_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

function getAIClient() {
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: GROQ_BASE_URL,
      }),
      model: GROQ_MODEL,
    };
  }

  return {
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    model: OPENAI_MODEL,
  };
}

function assertOpenAIConfigured() {
  const groqKey = process.env.GROQ_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  if (groqKey && !groqKey.includes("your-")) {
    return;
  }

  if (openAIKey && openAIKey !== "sk-..." && !openAIKey.includes("your-")) {
    return;
  }

  throw new Error("GROQ_API_KEY or OPENAI_API_KEY is missing or still set to a placeholder value.");
}

function parseGeneratedQuestions(raw: string, label: string): Omit<GeneratedQuestion, "type" | "difficulty">[] {
  try {
    const parsed = JSON.parse(raw);
    const candidate =
      Array.isArray(parsed)
        ? parsed
        : parsed.questions ??
          parsed.items ??
          parsed.data ??
          Object.values(parsed).find(Array.isArray);

    if (!Array.isArray(candidate)) {
      console.error(`[Generation] ${label} response did not contain a questions array:`, raw);
      return [];
    }

    return candidate.filter(
      (q) =>
        q &&
        typeof q.text === "string" &&
        Array.isArray(q.choices) &&
        q.choices.length > 0
    );
  } catch (error) {
    console.error(`[Generation] Failed to parse ${label} response JSON:`, error);
    console.error(`[Generation] Raw ${label} response:`, raw);
    return [];
  }
}

function normalizeConfidence(score: unknown, fallback = 0.75) {
  return typeof score === "number" && Number.isFinite(score) ? score : fallback;
}

// ============================================================
// System prompt for question generation
// ============================================================
const SYSTEM_PROMPT = `You are an expert educational assessment designer.
Your task is to generate high-quality exam questions ONLY from the provided source text.
NEVER invent facts, names, dates, or concepts that are not explicitly mentioned in the source text.
All generated answers must be directly verifiable from the source text.
Return responses as valid JSON only.`;

// ============================================================
// Generate multiple-choice questions
// ============================================================
async function generateMCQ(
  chunks: RetrievedChunk[],
  count: number,
  difficulty: Difficulty
): Promise<GeneratedQuestion[]> {
  const context = chunks.map((c) => c.content).join("\n\n---\n\n");

  const prompt = `Based ONLY on the following source text, generate ${count} multiple-choice questions at ${difficulty} difficulty.

SOURCE TEXT:
${context}

Requirements:
- Questions must test concepts explicitly found in the source text
- Each question must have exactly 4 answer choices
- Exactly one choice must be correct
- Distractors must be plausible but clearly wrong based on the text
- Easy = recall/definition, Medium = comprehension/application, Hard = analysis/synthesis
- Include a brief explanation referencing the source text

Return a JSON object with this exact structure:
{
  "questions": [
    {
    "text": "question text",
    "explanation": "why this answer is correct, citing the source",
    "topic": "topic/concept being tested",
    "keywords": ["key", "terms"],
    "sourceContext": "relevant excerpt from source text (max 200 chars)",
    "confidenceScore": 0.95,
    "choices": [
      { "text": "correct answer", "isCorrect": true },
      { "text": "distractor 1", "isCorrect": false },
      { "text": "distractor 2", "isCorrect": false },
      { "text": "distractor 3", "isCorrect": false }
    ]
    }
  ]
}`;

  assertOpenAIConfigured();
  const { client, model } = getAIClient();
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content ?? "{}";
  const questions = parseGeneratedQuestions(raw, "MCQ");

  return questions.map((q) => ({
    ...q,
    type: QuestionType.MULTIPLE_CHOICE,
    difficulty,
    confidenceScore: Math.max(
      normalizeConfidence(q.confidenceScore),
      validateAnswerAgainstChunks(q.choices.find((c) => c.isCorrect)?.text ?? "", chunks)
    ),
  }));
}

// ============================================================
// Generate true/false questions
// ============================================================
async function generateTrueFalse(
  chunks: RetrievedChunk[],
  count: number,
  difficulty: Difficulty
): Promise<GeneratedQuestion[]> {
  const context = chunks.map((c) => c.content).join("\n\n---\n\n");

  const prompt = `Based ONLY on the following source text, generate ${count} true/false questions at ${difficulty} difficulty.

SOURCE TEXT:
${context}

Requirements:
- Statements must be directly verifiable from the source text
- Balance true and false statements (roughly 50/50)
- False statements should have a plausible-sounding false claim based on the text

Return a JSON object:
{
  "questions": [
    {
    "text": "The statement to evaluate as true or false",
    "explanation": "explanation referencing source text",
    "topic": "topic being tested",
    "keywords": ["key", "terms"],
    "sourceContext": "relevant excerpt (max 200 chars)",
    "confidenceScore": 0.95,
    "choices": [
      { "text": "True", "isCorrect": true_or_false },
      { "text": "False", "isCorrect": true_or_false }
    ]
    }
  ]
}`;

  assertOpenAIConfigured();
  const { client, model } = getAIClient();
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content ?? "{}";
  const questions = parseGeneratedQuestions(raw, "True/False");

  return questions.map((q) => ({
    ...q,
    type: QuestionType.TRUE_FALSE,
    difficulty,
    confidenceScore: normalizeConfidence(q.confidenceScore),
  }));
}

// ============================================================
// Generate fill-in-the-blank questions
// ============================================================
async function generateFillInBlank(
  chunks: RetrievedChunk[],
  count: number,
  difficulty: Difficulty
): Promise<GeneratedQuestion[]> {
  const context = chunks.map((c) => c.content).join("\n\n---\n\n");

  const prompt = `Based ONLY on the following source text, generate ${count} fill-in-the-blank questions at ${difficulty} difficulty.

SOURCE TEXT:
${context}

Requirements:
- Remove a key term or phrase from a sentence found in the source text
- The blank should target an important concept
- The correct answer must be found verbatim or near-verbatim in the source text

Return a JSON object:
{
  "questions": [
    {
    "text": "The sentence with _____ where the answer goes",
    "explanation": "explanation of the correct answer",
    "topic": "topic being tested",
    "keywords": ["key", "terms"],
    "sourceContext": "original sentence from source",
    "confidenceScore": 0.97,
    "choices": [
      { "text": "correct answer here", "isCorrect": true }
    ]
    }
  ]
}`;

  assertOpenAIConfigured();
  const { client, model } = getAIClient();
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content ?? "{}";
  const questions = parseGeneratedQuestions(raw, "Fill-in-Blank");

  return questions.map((q) => ({
    ...q,
    type: QuestionType.FILL_IN_THE_BLANK,
    difficulty,
    confidenceScore: normalizeConfidence(q.confidenceScore),
  }));
}

// ============================================================
// Generate matching-type questions
// ============================================================
async function generateMatching(
  chunks: RetrievedChunk[],
  count: number,
  difficulty: Difficulty
): Promise<GeneratedQuestion[]> {
  const context = chunks.map((c) => c.content).join("\n\n---\n\n");

  const prompt = `Based ONLY on the following source text, generate ${count} matching-type questions at ${difficulty} difficulty.

SOURCE TEXT:
${context}

For each matching question, create 4-5 pairs where Column A contains terms/concepts and Column B contains their definitions/descriptions.

Return a JSON object:
{
  "questions": [
    {
    "text": "Match each term in Column A with its correct definition in Column B.",
    "explanation": "explanation of the correct matches",
    "topic": "topic being tested",
    "keywords": ["key", "terms"],
    "sourceContext": "relevant excerpt from source",
    "confidenceScore": 0.90,
    "choices": [
      { "text": "Column A Term 1", "isCorrect": true, "matchKey": "A1", "matchValue": "B1" },
      { "text": "Column B Definition 1", "isCorrect": true, "matchKey": "B1", "matchValue": "A1" },
      { "text": "Column A Term 2", "isCorrect": true, "matchKey": "A2", "matchValue": "B2" },
      { "text": "Column B Definition 2", "isCorrect": true, "matchKey": "B2", "matchValue": "A2" }
    ]
    }
  ]
}`;

  assertOpenAIConfigured();
  const { client, model } = getAIClient();
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content ?? "{}";
  const questions = parseGeneratedQuestions(raw, "Matching");

  return questions.map((q) => ({
    ...q,
    type: QuestionType.MATCHING,
    difficulty,
    confidenceScore: normalizeConfidence(q.confidenceScore),
  }));
}

// ============================================================
// Master question generation dispatcher
// ============================================================
export interface GenerationRequest {
  chunks: RetrievedChunk[];
  questionType: QuestionType;
  difficulty: Difficulty;
  count: number;
}

export async function generateQuestions(
  request: GenerationRequest
): Promise<GeneratedQuestion[]> {
  const { chunks, questionType, difficulty, count } = request;

  if (chunks.length === 0) return [];

  try {
    switch (questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        return generateMCQ(chunks, count, difficulty);
      case QuestionType.TRUE_FALSE:
        return generateTrueFalse(chunks, count, difficulty);
      case QuestionType.FILL_IN_THE_BLANK:
        return generateFillInBlank(chunks, count, difficulty);
      case QuestionType.MATCHING:
        return generateMatching(chunks, count, difficulty);
      default:
        return generateMCQ(chunks, count, difficulty);
    }
  } catch (error) {
    console.error(`[Generation] Error generating ${questionType}:`, error);
    throw error;
  }
}

// ============================================================
// Batch generation for a full quiz
// ============================================================
export interface BatchGenerationConfig {
  chunks: RetrievedChunk[];
  distribution: {
    type: QuestionType;
    difficulty: Difficulty;
    count: number;
  }[];
}

export async function generateQuizQuestions(
  config: BatchGenerationConfig
): Promise<GeneratedQuestion[]> {
  const results = await Promise.allSettled(
    config.distribution.map(({ type, difficulty, count }) =>
      generateQuestions({ chunks: config.chunks, questionType: type, difficulty, count })
    )
  );

  const allQuestions: GeneratedQuestion[] = [];
  const errors: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allQuestions.push(...result.value);
    } else {
      errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  }

  if (allQuestions.length === 0 && errors.length > 0) {
    throw new Error(errors[0]);
  }

  return allQuestions.filter((q) => q.text && q.choices.length > 0);
}

// ============================================================
// Extract key topics from a text using OpenAI
// ============================================================
export async function extractTopicsFromText(text: string): Promise<string[]> {
  assertOpenAIConfigured();
  const { client, model } = getAIClient();
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: "You are an NLP expert. Extract the main educational topics and key concepts from the given text. Return only a JSON array of strings.",
      },
      {
        role: "user",
        content: `Extract 3-8 main topics/concepts from this text:\n\n${text.slice(0, 3000)}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  try {
    const raw = response.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(raw);
    return (parsed.topics ?? parsed) as string[];
  } catch {
    return [];
  }
}

// ============================================================
// Extract keywords from text
// ============================================================
export async function extractKeywordsFromText(text: string): Promise<string[]> {
  assertOpenAIConfigured();
  const { client, model } = getAIClient();
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: "Extract the most important keywords and technical terms from the text. Return a JSON array of keyword strings.",
      },
      { role: "user", content: text.slice(0, 2000) },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  try {
    const raw = response.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(raw);
    return (parsed.keywords ?? parsed) as string[];
  } catch {
    return [];
  }
}
