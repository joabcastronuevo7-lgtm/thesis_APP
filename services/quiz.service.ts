import { quizRepository } from "@/repositories/quiz.repository";
import { retrieveDiverseChunks, buildRAGContext } from "@/lib/ai/rag";
import { generateQuizQuestions } from "@/lib/ai/generation";
import { prisma } from "@/lib/db";
import type { GeneratedQuestion, QuizGenerationConfig } from "@/types";
import { QuestionType, Difficulty } from "@prisma/client";

// ============================================================
// Build the distribution plan for question generation
// ============================================================
function buildGenerationDistribution(config: QuizGenerationConfig) {
  const { totalQuestions, difficultyDistribution, questionTypes } = config;
  const { easy, medium, hard } = difficultyDistribution;

  // Validate distribution sums to totalQuestions
  const total = easy + medium + hard;
  if (total !== totalQuestions) {
    throw new Error(
      `Difficulty distribution (${total}) must equal totalQuestions (${totalQuestions})`
    );
  }

  const distribution: {
    type: QuestionType;
    difficulty: Difficulty;
    count: number;
  }[] = [];

  const difficulties: { level: Difficulty; count: number }[] = [
    { level: Difficulty.EASY, count: easy },
    { level: Difficulty.MEDIUM, count: medium },
    { level: Difficulty.HARD, count: hard },
  ];

  // Distribute question types evenly across difficulties
  for (const { level, count } of difficulties) {
    if (count === 0) continue;

    const perType = Math.floor(count / questionTypes.length);
    const remainder = count % questionTypes.length;

    questionTypes.forEach((type, i) => {
      const typeCount = perType + (i < remainder ? 1 : 0);
      if (typeCount > 0) {
        distribution.push({ type, difficulty: level, count: typeCount });
      }
    });
  }

  return distribution;
}

// ============================================================
// Create quiz record and generate questions via RAG
// ============================================================
export async function createAndGenerateQuiz(
  config: QuizGenerationConfig,
  educatorId: string
): Promise<{ quizId: string; questionsGenerated: number }> {
  // 1. Create quiz record
  const quiz = await quizRepository.create({
    title: config.title,
    description: config.description,
    educatorId,
    timeLimit: config.timeLimit ?? null,
    passingScore: config.passingScore ?? 60,
    shuffleQuestions: config.shuffleQuestions ?? true,
    shuffleChoices: config.shuffleChoices ?? true,
    maxAttempts: config.maxAttempts ?? 1,
  });

  // 2. Link PDFs to quiz
  await quizRepository.addPDFs(quiz.id, config.pdfIds);

  // 3. Retrieve diverse chunks from all linked PDFs
  const chunks = config.topicFilter
    ? (await buildRAGContext(config.topicFilter, config.pdfIds, 15)).chunks
    : await retrieveDiverseChunks(config.pdfIds, 8, 4);

  if (chunks.length === 0) {
    throw new Error(
      "No content retrieved from PDFs. Ensure PDFs are processed before generating questions."
    );
  }

  // 4. Build generation distribution
  const distribution = buildGenerationDistribution(config);

  // 5. Generate questions
  const generatedQuestions = await generateQuizQuestions({
    chunks,
    distribution,
  });

  if (generatedQuestions.length === 0) {
    throw new Error("AI failed to generate any questions. Try with different PDFs or settings.");
  }

  // 6. Build chunkId map for associating questions with source chunks
  const chunkIdMap: Record<string, string> = {};
  for (const question of generatedQuestions) {
    const source = question.sourceContext?.trim();
    if (!source) continue;

    const matchingChunk = chunks.find((chunk) =>
      chunk.content.toLowerCase().includes(source.toLowerCase())
    );

    if (matchingChunk) {
      chunkIdMap[source.slice(0, 50)] = matchingChunk.id;
    }
  }

  // 7. Persist questions
  await quizRepository.saveGeneratedQuestions(quiz.id, generatedQuestions, chunkIdMap);

  return {
    quizId: quiz.id,
    questionsGenerated: generatedQuestions.length,
  };
}

// ============================================================
// Publish a quiz (change status to PUBLISHED)
// ============================================================
export async function publishQuiz(quizId: string, educatorId: string) {
  const quiz = await quizRepository.findById(quizId);
  if (!quiz) throw new Error("Quiz not found");
  if (quiz.educatorId !== educatorId) throw new Error("Unauthorized");
  if (quiz.questions.length === 0) throw new Error("Cannot publish empty quiz");

  return quizRepository.update(quizId, { status: "PUBLISHED" });
}

export async function regenerateQuizQuestions(
  quizId: string,
  educatorId: string
): Promise<{ quizId: string; questionsGenerated: number }> {
  const quiz = await quizRepository.findById(quizId);
  if (!quiz) throw new Error("Quiz not found");
  if (quiz.educatorId !== educatorId) throw new Error("Unauthorized");
  if (quiz.status !== "DRAFT") throw new Error("Only draft quizzes can be regenerated");
  if (quiz._count.attempts > 0) throw new Error("Quizzes with attempts cannot be regenerated");

  const pdfIds = quiz.pdfs.map(({ pdf }) => pdf.id);
  if (pdfIds.length === 0) throw new Error("This quiz has no source PDFs");

  const existingQuestions = quiz.questions;
  const totalQuestions = Math.max(1, quiz.totalQuestions || existingQuestions.length || 10);
  const difficultyDistribution = {
    easy: existingQuestions.filter((q) => q.difficulty === Difficulty.EASY).length,
    medium: existingQuestions.filter((q) => q.difficulty === Difficulty.MEDIUM).length,
    hard: existingQuestions.filter((q) => q.difficulty === Difficulty.HARD).length,
  };

  if (
    difficultyDistribution.easy +
      difficultyDistribution.medium +
      difficultyDistribution.hard !==
    totalQuestions
  ) {
    difficultyDistribution.easy = Math.floor(totalQuestions * 0.3);
    difficultyDistribution.hard = Math.floor(totalQuestions * 0.2);
    difficultyDistribution.medium =
      totalQuestions - difficultyDistribution.easy - difficultyDistribution.hard;
  }

  const questionTypes = Array.from(
    new Set(existingQuestions.map((q) => q.type))
  );

  const chunks = await retrieveDiverseChunks(pdfIds, 8, 4);
  if (chunks.length === 0) {
    throw new Error(
      "No content retrieved from PDFs. Ensure PDFs are processed before regenerating questions."
    );
  }

  const generatedQuestions = await generateQuizQuestions({
    chunks,
    distribution: buildGenerationDistribution({
      pdfIds,
      totalQuestions,
      difficultyDistribution,
      questionTypes: questionTypes.length > 0 ? questionTypes : [QuestionType.MULTIPLE_CHOICE],
      title: quiz.title,
      description: quiz.description ?? undefined,
      timeLimit: quiz.timeLimit ?? undefined,
      passingScore: quiz.passingScore,
      shuffleQuestions: quiz.shuffleQuestions,
      shuffleChoices: quiz.shuffleChoices,
      maxAttempts: quiz.maxAttempts,
    }),
  });

  if (generatedQuestions.length === 0) {
    throw new Error("AI failed to regenerate questions. Try again with different settings.");
  }

  const chunkIdMap: Record<string, string> = {};
  for (const question of generatedQuestions) {
    const source = question.sourceContext?.trim();
    if (!source) continue;

    const matchingChunk = chunks.find((chunk) =>
      chunk.content.toLowerCase().includes(source.toLowerCase())
    );

    if (matchingChunk) {
      chunkIdMap[source.slice(0, 50)] = matchingChunk.id;
    }
  }

  await quizRepository.replaceGeneratedQuestions(quizId, generatedQuestions, chunkIdMap);

  return {
    quizId,
    questionsGenerated: generatedQuestions.length,
  };
}

export async function generateQuestionBankAlternatives(
  questionId: string,
  educatorId: string,
  count = 5
): Promise<GeneratedQuestion[]> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      quiz: {
        include: {
          pdfs: { include: { pdf: true } },
        },
      },
    },
  });

  if (!question) throw new Error("Question not found");
  if (question.quiz.educatorId !== educatorId) throw new Error("Unauthorized");
  if (question.quiz.status !== "DRAFT") {
    throw new Error("AI question bank is available only for draft quizzes");
  }

  const pdfIds = question.quiz.pdfs.map(({ pdf }) => pdf.id);
  if (pdfIds.length === 0) throw new Error("This quiz has no source PDFs");

  const chunks = question.topic
    ? (await buildRAGContext(question.topic, pdfIds, 12)).chunks
    : await retrieveDiverseChunks(pdfIds, 6, 3);

  if (chunks.length === 0) {
    throw new Error("No source content found for generating alternatives");
  }

  const alternatives = await generateQuizQuestions({
    chunks,
    distribution: [
      {
        type: question.type,
        difficulty: question.difficulty,
        count,
      },
    ],
  });

  return alternatives.slice(0, count);
}
