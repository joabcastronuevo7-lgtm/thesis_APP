import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyticsRepository } from "@/repositories/analytics.repository";

export async function GET(_request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const stats = await analyticsRepository.getAdminStats();
    return NextResponse.json({ success: true, data: stats });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
}
