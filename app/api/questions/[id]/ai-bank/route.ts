import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateQuestionBankAlternatives } from "@/services/quiz.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const questions = await generateQuestionBankAlternatives(id, session.user.id);

    return NextResponse.json({
      success: true,
      data: questions,
      message: `Generated ${questions.length} AI bank questions`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI question bank generation failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
