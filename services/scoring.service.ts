import { prisma } from "@/lib/db";
import { analyticsRepository } from "@/repositories/analytics.repository";
import type { AttemptSubmitInput } from "@/lib/validations";
import { QuestionType } from "@prisma/client";

// ============================================================
// Submit and score an attempt
// ============================================================
export async function scoreAttempt(
  attemptId: string,
  studentId: string,
  submission: AttemptSubmitInput
): Promise<{
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
}> {
  const attempt = await prisma.studentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: {
            include: { choices: true },
          },
        },
      },
    },
  });

  if (!attempt) throw new Error("Attempt not found");
  if (attempt.studentId !== studentId) throw new Error("Unauthorized");
  if (attempt.status !== "IN_PROGRESS") throw new Error("Attempt already submitted");

  const questionMap = new Map(
    attempt.quiz.questions.map((q) => [q.id, q])
  );

  let score = 0;
  const maxScore = attempt.quiz.questions.reduce((s, q) => s + q.points, 0);

  const answerData: {
    attemptId: string;
    questionId: string;
    choiceId?: string;
    textAnswer?: string;
    isCorrect: boolean;
    pointsEarned: number;
  }[] = [];

  for (const answer of submission.answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) continue;

    let isCorrect = false;
    let pointsEarned = 0;

    if (question.type === QuestionType.FILL_IN_THE_BLANK) {
      const correctChoice = question.choices.find((c) => c.isCorrect);
      if (correctChoice && answer.textAnswer) {
        isCorrect =
          answer.textAnswer.trim().toLowerCase() ===
          correctChoice.text.trim().toLowerCase();
      }
    } else if (question.type === QuestionType.MATCHING) {
      // textAnswer encodes student pairs as JSON: { columnA_choiceId: columnB_choiceId }
      if (answer.textAnswer) {
        try {
          const studentPairs = JSON.parse(answer.textAnswer) as Record<string, string>;
          // Split choices into Column A (matchKey starts with 'A') and Column B
          const colA = question.choices.filter((c) => c.matchKey?.startsWith("A"));
          const colB = question.choices.filter((c) => c.matchKey?.startsWith("B"));
          const colBByKey = new Map(colB.map((c) => [c.matchKey, c.id]));
          // All pairs must be correct (all-or-nothing)
          isCorrect =
            colA.length > 0 &&
            colA.every((a) => {
              const correctBId = colBByKey.get(a.matchValue ?? "");
              return studentPairs[a.id] === correctBId;
            });
        } catch {
          isCorrect = false;
        }
      }
    } else if (answer.choiceId) {
      const selectedChoice = question.choices.find(
        (c) => c.id === answer.choiceId
      );
      isCorrect = selectedChoice?.isCorrect ?? false;
    }

    if (isCorrect) {
      pointsEarned = question.points;
      score += pointsEarned;
    }

    answerData.push({
      attemptId,
      questionId: answer.questionId,
      choiceId: answer.choiceId,
      textAnswer: answer.textAnswer,
      isCorrect,
      pointsEarned,
    });
  }

  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const passed = percentage >= attempt.quiz.passingScore;
  const timeTakenSecs = submission.timeTakenSecs;

  // Persist answers and update attempt
  await prisma.$transaction([
    prisma.studentAnswer.createMany({ data: answerData }),
    prisma.studentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "GRADED",
        score,
        maxScore,
        percentage,
        submittedAt: new Date(),
        timeTakenSecs,
        feedback: passed
          ? "Congratulations! You passed this exam."
          : `You scored ${Math.round(percentage)}%. Keep studying — you need ${attempt.quiz.passingScore}% to pass.`,
      },
    }),
  ]);

  // Update weak topics for this student
  for (const answer of answerData) {
    const question = questionMap.get(answer.questionId);
    if (question?.topic) {
      await analyticsRepository.upsertWeakTopic(
        studentId,
        question.topic,
        answer.isCorrect,
        attempt.quizId
      );
    }
  }

  // Refresh quiz-level analytics
  await analyticsRepository.updateQuizAnalytics(attempt.quizId);

  return { score, maxScore, percentage, passed };
}
