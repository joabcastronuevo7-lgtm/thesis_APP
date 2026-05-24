"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

type Role = "ADMIN" | "EDUCATOR" | "STUDENT";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  image?: string | null;
}

function sessionToUser(supabaseUser: User): AuthUser {
  const m = supabaseUser.user_metadata ?? {};
  return {
    id: (m.prismaId ?? supabaseUser.id) as string,
    name: (m.name ?? "") as string,
    email: supabaseUser.email ?? "",
    role: (m.role ?? "STUDENT") as Role,
    image: (m.image ?? null) as string | null,
  };
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    // Load initial session from the cookie set by /api/auth/login
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ? sessionToUser(session.user) : null);
      setIsLoading(false);
    });

    // Keep state in sync when the session changes (sign-in / sign-out / refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ? sessionToUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    const supabase = getBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "ADMIN",
    isEducator: user?.role === "EDUCATOR",
    isStudent: user?.role === "STUDENT",
    logout,
  };
}
