import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { quizRepository } from "@/repositories/quiz.repository";
import { quizGenerationSchema } from "@/lib/validations";
import { createAndGenerateQuiz } from "@/services/quiz.service";
import { parsePaginationParams, generatePaginationMeta } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePaginationParams(searchParams);
    const search = searchParams.get("search") ?? undefined;
    const status = searchParams.get("status") as "DRAFT" | "PUBLISHED" | null;

    const educatorId =
      session.user.role === "EDUCATOR" ? session.user.id : undefined;

    const { data, total } = await quizRepository.findMany({
      page,
      pageSize,
      educatorId,
      status: status ?? undefined,
      search,
    });

    return NextResponse.json({
      success: true,
      data,
      ...generatePaginationMeta(total, page, pageSize),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch quizzes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = quizGenerationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await createAndGenerateQuiz(parsed.data, session.user.id);

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: `Quiz created with ${result.questionsGenerated} AI-generated questions`,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quiz creation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
