import OpenAI from "openai";
import type { GeneratedQuestion, RetrievedChunk } from "@/types";
import { QuestionType, Difficulty } from "@prisma/client";
import { validateAnswerAgainstChunks } from "./rag";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

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

Return a JSON array with this exact structure:
[
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
]`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content ?? "{}";
  let questions: GeneratedQuestion[] = [];
  try {
    const parsed = JSON.parse(raw);
    questions = (parsed.questions ?? parsed) as GeneratedQuestion[];
  } catch {
    console.error("[Generation] Failed to parse MCQ response JSON");
    return [];
  }

  return questions.map((q) => ({
    ...q,
    type: QuestionType.MULTIPLE_CHOICE,
    difficulty,
    confidenceScore: validateAnswerAgainstChunks(
      q.choices.find((c) => c.isCorrect)?.text ?? "",
      chunks
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

Return a JSON array:
[
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
]`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content ?? "{}";
  let questions: GeneratedQuestion[] = [];
  try {
    const parsed = JSON.parse(raw);
    questions = (parsed.questions ?? parsed) as GeneratedQuestion[];
  } catch {
    console.error("[Generation] Failed to parse True/False response JSON");
    return [];
  }

  return questions.map((q) => ({
    ...q,
    type: QuestionType.TRUE_FALSE,
    difficulty,
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

Return a JSON array:
[
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
]`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content ?? "{}";
  let questions: GeneratedQuestion[] = [];
  try {
    const parsed = JSON.parse(raw);
    questions = (parsed.questions ?? parsed) as GeneratedQuestion[];
  } catch {
    console.error("[Generation] Failed to parse Fill-in-Blank response JSON");
    return [];
  }

  return questions.map((q) => ({
    ...q,
    type: QuestionType.FILL_IN_THE_BLANK,
    difficulty,
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

Return a JSON array:
[
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
]`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content ?? "{}";
  let questions: GeneratedQuestion[] = [];
  try {
    const parsed = JSON.parse(raw);
    questions = (parsed.questions ?? parsed) as GeneratedQuestion[];
  } catch {
    console.error("[Generation] Failed to parse Matching response JSON");
    return [];
  }

  return questions.map((q) => ({
    ...q,
    type: QuestionType.MATCHING,
    difficulty,
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
    return [];
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
  for (const result of results) {
    if (result.status === "fulfilled") {
      allQuestions.push(...result.value);
    }
  }

  // Filter out low-confidence questions (< 0.4 = likely hallucinated).
  // Default to 0.3 (below threshold) when the LLM omits the field so unscored
  // questions are rejected rather than silently passed through.
  return allQuestions.filter((q) => (q.confidenceScore ?? 0.3) >= 0.4);
}

// ============================================================
// Extract key topics from a text using OpenAI
// ============================================================
export async function extractTopicsFromText(text: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: MODEL,
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
  const response = await openai.chat.completions.create({
    model: MODEL,
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
