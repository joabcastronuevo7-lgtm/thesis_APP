import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { quizRepository } from "@/repositories/quiz.repository";
import { quizUpdateSchema } from "@/lib/validations";

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
    const quiz = await quizRepository.findById(id);

    if (!quiz) {
      return NextResponse.json({ success: false, error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: quiz });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch quiz" }, { status: 500 });
  }
}

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
    const quiz = await quizRepository.findById(id);
    if (!quiz) return NextResponse.json({ success: false, error: "Quiz not found" }, { status: 404 });
    if (session.user.role === "EDUCATOR" && quiz.educatorId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = quizUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await quizRepository.update(id, parsed.data as Parameters<typeof quizRepository.update>[1]);
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
    const quiz = await quizRepository.findById(id);
    if (!quiz) return NextResponse.json({ success: false, error: "Quiz not found" }, { status: 404 });
    if (session.user.role === "EDUCATOR" && quiz.educatorId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    await quizRepository.softDelete(id);
    return NextResponse.json({ success: true, message: "Quiz deleted" });
  } catch {
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
  }
}
