import { createSupabaseServerClient } from "@/lib/supabase-server";

type Role = "ADMIN" | "EDUCATOR" | "STUDENT";

// Reads the Supabase Auth session from the request cookie and returns the
// same { user: { id, name, email, role, image } } shape that all API routes
// already expect.  public.users.id == Supabase Auth user.id (UUID).
export async function auth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const m = user.user_metadata ?? {};
  return {
    user: {
      id: user.id as string,               // Supabase Auth UUID == public.users.id
      name: (m.name ?? "") as string,
      email: user.email!,
      role: (m.role ?? "STUDENT") as Role,
      image: (m.image ?? null) as string | null,
    },
  };
}

// Stub so the (now-neutered) [...nextauth] route still compiles.
export const handlers = {
  GET: () => new Response(null, { status: 404 }),
  POST: () => new Response(null, { status: 404 }),
};
