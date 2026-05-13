import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Start a new quiz attempt
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { quizId } = body as { quizId: string };

    if (!quizId) {
      return NextResponse.json({ success: false, error: "quizId is required" }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, status: "PUBLISHED" },
      include: {
        questions: {
          include: { choices: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ success: false, error: "Quiz not found or not published" }, { status: 404 });
    }

    // Check attempt limit
    const existingAttempts = await prisma.studentAttempt.count({
      where: { quizId, studentId: session.user.id },
    });

    if (existingAttempts >= quiz.maxAttempts) {
      return NextResponse.json(
        { success: false, error: `Maximum attempts (${quiz.maxAttempts}) reached` },
        { status: 400 }
      );
    }

    const attempt = await prisma.studentAttempt.create({
      data: {
        quizId,
        studentId: session.user.id,
        attemptNumber: existingAttempts + 1,
        status: "IN_PROGRESS",
      },
    });

    // Shuffle questions if needed
    let questions = quiz.questions;
    if (quiz.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    // Shuffle choices if needed
    if (quiz.shuffleChoices) {
      questions = questions.map((q) => ({
        ...q,
        choices: [...q.choices].sort(() => Math.random() - 0.5),
      }));
    }

    // Return attempt with questions (hide correct answers)
    const sanitizedQuestions = questions.map((q) => ({
      ...q,
      choices: q.choices.map((c) => ({
        ...c,
        isCorrect: undefined, // never expose correct answer to client
      })),
      explanation: undefined, // hide until after submission
    }));

    return NextResponse.json({
      success: true,
      data: {
        attempt,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          timeLimit: quiz.timeLimit,
          totalQuestions: quiz.totalQuestions,
          passingScore: quiz.passingScore,
        },
        questions: sanitizedQuestions,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to start attempt" }, { status: 500 });
  }
}
