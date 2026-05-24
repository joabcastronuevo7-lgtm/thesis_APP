import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { QuestionType, Difficulty } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId") ?? undefined;
    const type = searchParams.get("type") as QuestionType | null;
    const difficulty = searchParams.get("difficulty") as Difficulty | null;
    const search = searchParams.get("search")?.trim();

    const questions = await prisma.question.findMany({
      where: {
        ...(quizId && { quizId: { not: quizId } }),
        ...(type && Object.values(QuestionType).includes(type) && { type }),
        ...(difficulty && Object.values(Difficulty).includes(difficulty) && { difficulty }),
        ...(search && {
          OR: [
            { text: { contains: search, mode: "insensitive" } },
            { topic: { contains: search, mode: "insensitive" } },
          ],
        }),
        quiz: {
          deletedAt: null,
          ...(session.user.role === "EDUCATOR" && { educatorId: session.user.id }),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        choices: { orderBy: { order: "asc" } },
        quiz: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: questions });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch question bank" }, { status: 500 });
  }
}
