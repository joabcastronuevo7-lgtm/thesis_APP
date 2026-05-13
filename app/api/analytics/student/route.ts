import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyticsRepository } from "@/repositories/analytics.repository";

export async function GET(_request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [attempts, weakTopics] = await Promise.all([
      analyticsRepository.getStudentAttempts(session.user.id),
      analyticsRepository.getWeakTopics(session.user.id),
    ]);

    const completedAttempts = attempts.filter((a) => a.status === "GRADED");
    const avgScore =
      completedAttempts.length > 0
        ? completedAttempts.reduce((s, a) => s + (a.percentage ?? 0), 0) /
          completedAttempts.length
        : 0;
    const bestScore = completedAttempts.length > 0
      ? Math.max(...completedAttempts.map((a) => a.percentage ?? 0))
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalAttempts: attempts.length,
        completedAttempts: completedAttempts.length,
        avgScore: Math.round(avgScore),
        bestScore: Math.round(bestScore),
        weakTopics,
        recentAttempts: completedAttempts.slice(0, 5),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
}
