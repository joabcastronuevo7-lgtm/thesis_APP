import { userRepository } from "@/repositories/user.repository";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";

type Role = "ADMIN" | "EDUCATOR" | "STUDENT";

export const authService = {
  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: Role;
  }) {
    console.log("[Register] ▶ register() called for:", data.email);

    const role = data.role ?? "STUDENT";

    // ── 1. Guard: reject duplicate emails ──────────────────────────────────
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      console.log("[Register] ✗ email already exists in Prisma");
      throw new Error("An account with this email already exists");
    }

    // ── 2. Create the identity in Supabase Auth ────────────────────────────
    //    This is the authoritative source — the row must appear in
    //    Authentication → Users in the Supabase dashboard.
    //    email_confirm:true skips the confirmation email (dev convenience).
    console.log("[Register] ▶ calling supabaseAdmin.auth.admin.createUser …");
    console.log("[Register]   url:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("[Register]   service key set:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: supabaseData, error: supabaseError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { name: data.name, role },
      });

    if (supabaseError) {
      console.error("[Register] ✗ Supabase Auth error:", supabaseError.message);
      throw new Error(supabaseError.message);
    }

    const supabaseUid = supabaseData.user.id;
    console.log("[Register] ✓ Supabase Auth user created, uid:", supabaseUid);

    // ── 3. Create the matching public.users row using the Supabase UUID ─────
    //    The id is the Supabase Auth UUID so public.users.id == auth.users.id.
    let user;
    try {
      const hashedPassword = await hashPassword(data.password);
      user = await userRepository.create({
        id: supabaseUid,          // ← UUID, not a CUID
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role,
      });
      console.log("[Register] ✓ public.users row created, id:", user.id);
    } catch (err) {
      // Roll back the Supabase Auth user so the two stores stay in sync
      console.error("[Register] ✗ Prisma create failed — rolling back Supabase Auth user");
      await supabaseAdmin.auth.admin.deleteUser(supabaseUid).catch(() => null);
      throw err;
    }

    // ── 4. Audit log ────────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_REGISTERED",
        entity: "User",
        entityId: user.id,
        metadata: { email: user.email, role: user.role },
      },
    });

    console.log("[Register] ✓ registration complete for:", user.email);
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  },
};
