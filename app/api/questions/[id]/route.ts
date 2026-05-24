import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { questionUpdateSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.question.findUnique({
      where: { id },
      include: { quiz: { select: { educatorId: true, status: true } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }
    if (existing.quiz.status !== "DRAFT") {
      return NextResponse.json({ success: false, error: "Only draft quiz questions can be edited" }, { status: 400 });
    }
    if (session.user.role === "EDUCATOR" && existing.quiz.educatorId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = questionUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { choices, ...questionData } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const question = await tx.question.update({
        where: { id },
        data: questionData,
      });

      if (choices && choices.length > 0) {
        // Delete existing choices and recreate
        await tx.choice.deleteMany({ where: { questionId: id } });
        await tx.choice.createMany({
          data: choices.map((c, i) => ({
            questionId: id,
            text: c.text,
            isCorrect: c.isCorrect,
            matchKey: c.matchKey,
            matchValue: c.matchValue,
            order: i,
          })),
        });
      }

      return question;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.question.findUnique({
      where: { id },
      include: { quiz: { select: { educatorId: true, status: true } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }
    if (existing.quiz.status !== "DRAFT") {
      return NextResponse.json({ success: false, error: "Only draft quiz questions can be deleted" }, { status: 400 });
    }
    if (session.user.role === "EDUCATOR" && existing.quiz.educatorId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    await prisma.question.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Question deleted" });
  } catch {
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
  }
}
