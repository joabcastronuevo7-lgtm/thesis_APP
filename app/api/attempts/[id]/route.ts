import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Get attempt result with full answers and explanations
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id },
      include: {
        quiz: {
          select: { id: true, title: true, passingScore: true, totalQuestions: true, educatorId: true },
        },
        student: { select: { id: true, name: true, email: true } },
        answers: {
          include: {
            question: {
              include: { choices: { orderBy: { order: "asc" } } },
            },
            choice: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ success: false, error: "Attempt not found" }, { status: 404 });
    }

    // Students can only see their own attempts
    if (session.user.role === "STUDENT" && attempt.studentId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Educators can only see attempts for quizzes they own
    if (session.user.role === "EDUCATOR" && attempt.quiz.educatorId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: attempt });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch attempt" }, { status: 500 });
  }
}
