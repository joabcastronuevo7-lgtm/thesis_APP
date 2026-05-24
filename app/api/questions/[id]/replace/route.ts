import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as { sourceQuestionId?: string };
    if (!body.sourceQuestionId) {
      return NextResponse.json({ success: false, error: "sourceQuestionId is required" }, { status: 400 });
    }

    const [targetQuestion, sourceQuestion] = await Promise.all([
      prisma.question.findUnique({
        where: { id },
        include: {
          quiz: { select: { educatorId: true, status: true } },
        },
      }),
      prisma.question.findUnique({
        where: { id: body.sourceQuestionId },
        include: {
          choices: { orderBy: { order: "asc" } },
          quiz: { select: { educatorId: true } },
        },
      }),
    ]);

    if (!targetQuestion || !sourceQuestion) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }
    if (targetQuestion.quiz.status !== "DRAFT") {
      return NextResponse.json({ success: false, error: "Only draft quiz questions can be replaced" }, { status: 400 });
    }
    if (
      session.user.role === "EDUCATOR" &&
      (targetQuestion.quiz.educatorId !== session.user.id ||
        sourceQuestion.quiz.educatorId !== session.user.id)
    ) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const question = await tx.question.update({
        where: { id },
        data: {
          type: sourceQuestion.type,
          difficulty: sourceQuestion.difficulty,
          text: sourceQuestion.text,
          explanation: sourceQuestion.explanation,
          topic: sourceQuestion.topic,
          keywords: sourceQuestion.keywords,
          sourceContext: sourceQuestion.sourceContext,
          confidenceScore: sourceQuestion.confidenceScore,
          chunkId: sourceQuestion.chunkId,
        },
      });

      await tx.choice.deleteMany({ where: { questionId: id } });
      await tx.choice.createMany({
        data: sourceQuestion.choices.map((choice, index) => ({
          questionId: id,
          text: choice.text,
          isCorrect: choice.isCorrect,
          matchKey: choice.matchKey,
          matchValue: choice.matchValue,
          order: index,
        })),
      });

      return question;
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Question replaced from the question bank",
    });
  } catch {
    return NextResponse.json({ success: false, error: "Question replacement failed" }, { status: 500 });
  }
}
