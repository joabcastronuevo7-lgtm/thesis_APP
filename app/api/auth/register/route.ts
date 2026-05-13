import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import { authService } from "@/services/auth.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const user = await authService.register(parsed.data);

    return NextResponse.json(
      { success: true, data: user, message: "Account created successfully" },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    console.error("[Register]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
