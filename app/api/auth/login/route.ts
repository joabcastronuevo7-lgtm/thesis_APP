import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      console.error("[Login] Supabase error:", error.message);
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const m = data.user.user_metadata ?? {};
    console.log("[Login] Success for:", data.user.email, "role:", m.role);

    return NextResponse.json({
      success: true,
      user: {
        id: m.prismaId ?? data.user.id,
        name: m.name ?? "",
        email: data.user.email!,
        role: m.role ?? "STUDENT",
      },
    });
  } catch (err) {
    console.error("[Login] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
