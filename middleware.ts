import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password"];
const API_PUBLIC_PATHS = ["/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiPath = pathname.startsWith("/api/");

  // Public API paths (register, login, logout) bypass auth
  if (API_PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Build a response we can attach refreshed cookies to
  let response = NextResponse.next({ request });

  // Create a Supabase client that reads/writes cookies on the request/response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT and refreshes the session if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow public pages whether logged in or not
  if (PUBLIC_PATHS.includes(pathname)) {
    return response;
  }

  // Redirect unauthenticated users to login
  if (!user) {
    if (isApiPath) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route guards
  const role = (user.user_metadata?.role ?? "") as string;

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (
    pathname.startsWith("/educator") &&
    !["ADMIN", "EDUCATOR"].includes(role)
  ) {
    if (isApiPath) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (
    pathname.startsWith("/student") &&
    !["ADMIN", "STUDENT"].includes(role)
  ) {
    if (isApiPath) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
