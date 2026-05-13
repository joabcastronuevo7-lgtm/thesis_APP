import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyticsRepository } from "@/repositories/analytics.repository";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [quizAnalytics, attempts] = await Promise.all([
      prisma.analytics.findUnique({ where: { quizId: id } }),
      analyticsRepository.getQuizAttempts(id),
    ]);

    // Question-level stats
    const questionStats: Record<
      string,
      { correct: number; total: number; topic: string | null; difficulty: string }
    > = {};

    for (const attempt of attempts) {
      for (const answer of attempt.answers) {
        const qId = answer.question.id;
        if (!questionStats[qId]) {
          questionStats[qId] = {
            correct: 0,
            total: 0,
            topic: answer.question.topic,
            difficulty: answer.question.difficulty,
          };
        }
        questionStats[qId].total++;
        if (answer.isCorrect) questionStats[qId].correct++;
      }
    }

    const questionStatsList = Object.entries(questionStats).map(([qId, s]) => ({
      questionId: qId,
      correctRate: s.total > 0 ? (s.correct / s.total) * 100 : 0,
      topic: s.topic,
      difficulty: s.difficulty,
    }));

    return NextResponse.json({
      success: true,
      data: {
        overview: quizAnalytics,
        questionStats: questionStatsList,
        totalAttempts: attempts.length,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch quiz analytics" }, { status: 500 });
  }
}
