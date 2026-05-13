import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { publishQuiz } from "@/services/quiz.service";

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
    const quiz = await publishQuiz(id, session.user.id);

    return NextResponse.json({
      success: true,
      data: quiz,
      message: "Quiz published successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
