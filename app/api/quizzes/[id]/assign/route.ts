import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { quizRepository } from "@/repositories/quiz.repository";
import { z } from "zod";

const assignSchema = z.object({
  studentIds: z.array(z.string().cuid()).min(1),
});

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

    const quiz = await quizRepository.findById(id);
    if (!quiz) {
      return NextResponse.json({ success: false, error: "Quiz not found" }, { status: 404 });
    }

    // Educators can only assign their own quizzes; admins can assign any
    if (session.user.role === "EDUCATOR" && quiz.educatorId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Only published quizzes can be assigned to students
    if (quiz.status !== "PUBLISHED") {
      return NextResponse.json(
        { success: false, error: "Only published quizzes can be assigned" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    await quizRepository.assignToStudents(id, parsed.data.studentIds, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Quiz assigned to ${parsed.data.studentIds.length} student(s)`,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Assignment failed" }, { status: 500 });
  }
}
