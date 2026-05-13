import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { userRepository } from "@/repositories/user.repository";
import { parsePaginationParams, generatePaginationMeta } from "@/lib/utils";
import type { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePaginationParams(searchParams);
    const search = searchParams.get("search") ?? undefined;
    const role = searchParams.get("role") as Role | null;

    const { data, total } = await userRepository.findMany({
      page,
      pageSize,
      search,
      role: role ?? undefined,
    });

    return NextResponse.json({
      success: true,
      data,
      ...generatePaginationMeta(total, page, pageSize),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}
