import { quizRepository } from "@/repositories/quiz.repository";
import { pdfRepository } from "@/repositories/pdf.repository";
import { retrieveDiverseChunks, buildRAGContext } from "@/lib/ai/rag";
import { generateQuizQuestions } from "@/lib/ai/generation";
import type { QuizGenerationConfig } from "@/types";
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
  for (const chunk of chunks) {
    const key = chunk.content.slice(0, 50);
    chunkIdMap[key] = chunk.id;
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
