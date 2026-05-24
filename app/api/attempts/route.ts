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

    const assignment = await prisma.examAssignment.findUnique({
      where: { quizId_studentId: { quizId, studentId: session.user.id } },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "This exam has not been assigned to you" },
        { status: 403 }
      );
    }

    if (assignment.dueAt && assignment.dueAt <= new Date()) {
      return NextResponse.json(
        { success: false, error: "This exam assignment is already closed" },
        { status: 400 }
      );
    }

    const inProgressAttempt = await prisma.studentAttempt.findFirst({
      where: { quizId, studentId: session.user.id, status: "IN_PROGRESS" },
      orderBy: { startedAt: "desc" },
    });

    const timeLimitSecs = quiz.timeLimit ? quiz.timeLimit * 60 : null;
    if (inProgressAttempt && timeLimitSecs !== null) {
      const elapsedSecs = Math.floor(
        (Date.now() - inProgressAttempt.startedAt.getTime()) / 1000
      );

      if (elapsedSecs >= timeLimitSecs) {
        await prisma.studentAttempt.update({
          where: { id: inProgressAttempt.id },
          data: {
            status: "EXPIRED",
            submittedAt: new Date(),
            timeTakenSecs: elapsedSecs,
            feedback: "The time limit expired before this exam was submitted.",
          },
        });
      }
    }

    // Check attempt limit
    const existingAttempts = await prisma.studentAttempt.count({
      where: { quizId, studentId: session.user.id },
    });

    const reusableAttempt =
      inProgressAttempt && (!timeLimitSecs ||
        Math.floor((Date.now() - inProgressAttempt.startedAt.getTime()) / 1000) < timeLimitSecs)
        ? inProgressAttempt
        : null;

    if (existingAttempts >= quiz.maxAttempts) {
      if (!reusableAttempt) {
        return NextResponse.json(
          { success: false, error: `Maximum attempts (${quiz.maxAttempts}) reached` },
          { status: 400 }
        );
      }
    }

    const attempt = reusableAttempt ?? await prisma.studentAttempt.create({
      data: {
        quizId,
        studentId: session.user.id,
        attemptNumber: existingAttempts + 1,
        status: "IN_PROGRESS",
      },
    });

    const elapsedSecs = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
    const timeRemainingSecs = timeLimitSecs === null
      ? null
      : Math.max(timeLimitSecs - elapsedSecs, 0);

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
          dueAt: assignment.dueAt,
          timeRemainingSecs,
        },
        questions: sanitizedQuestions,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to start attempt" }, { status: 500 });
  }
}
