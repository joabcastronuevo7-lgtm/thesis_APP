import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pdfRepository } from "@/repositories/pdf.repository";
import { deleteVectorsByPdfId } from "@/lib/ai/embeddings";
import { deletePDFFromStorage } from "@/lib/supabase";

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
    const pdf = await pdfRepository.findById(id);

    if (!pdf) {
      return NextResponse.json({ success: false, error: "PDF not found" }, { status: 404 });
    }

    if (
      session.user.role === "EDUCATOR" &&
      pdf.uploadedById !== session.user.id
    ) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: pdf });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch PDF" }, { status: 500 });
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
    const pdf = await pdfRepository.findById(id);

    if (!pdf) {
      return NextResponse.json({ success: false, error: "PDF not found" }, { status: 404 });
    }

    if (
      session.user.role === "EDUCATOR" &&
      pdf.uploadedById !== session.user.id
    ) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Remove vectors from Pinecone and file from Supabase Storage
    await Promise.all([
      deleteVectorsByPdfId(id),
      deletePDFFromStorage(pdf.fileUrl),
    ]);

    // Soft delete DB record
    await pdfRepository.softDelete(id);

    return NextResponse.json({ success: true, message: "PDF deleted" });
  } catch {
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
  }
}
