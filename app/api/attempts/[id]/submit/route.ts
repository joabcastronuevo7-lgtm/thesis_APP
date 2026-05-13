import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { scoreAttempt } from "@/services/scoring.service";
import { attemptSubmitSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = attemptSubmitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await scoreAttempt(id, session.user.id, parsed.data);

    return NextResponse.json({
      success: true,
      data: result,
      message: result.passed ? "Congratulations! You passed!" : "Exam submitted.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
