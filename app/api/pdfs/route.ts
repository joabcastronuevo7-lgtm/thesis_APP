import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pdfRepository } from "@/repositories/pdf.repository";
import { parsePaginationParams, generatePaginationMeta } from "@/lib/utils";
import { uploadPDFToStorage } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePaginationParams(searchParams);
    const search = searchParams.get("search") ?? undefined;

    // Students cannot browse PDFs
    const uploadedById =
      session.user.role === "EDUCATOR" ? session.user.id : undefined;

    const { data, total } = await pdfRepository.findMany({
      page,
      pageSize,
      uploadedById,
      search,
    });

    return NextResponse.json({
      success: true,
      data,
      ...generatePaginationMeta(total, page, pageSize),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch PDFs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ success: false, error: "Only PDF files are allowed" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File too large (max 50MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage and get the public URL
    const fileUrl = await uploadPDFToStorage(buffer, file.name, session.user.id);

    // Create DB record with the Supabase Storage URL
    const pdf = await pdfRepository.create({
      title: title || file.name.replace(".pdf", ""),
      fileName: file.name,
      fileUrl,
      fileSize: file.size,
      uploadedById: session.user.id,
    });

    // Mark as PROCESSING immediately so concurrent uploads can't double-process
    await pdfRepository.updateStatus(pdf.id, "PROCESSING");

    // Fire-and-forget RAG processing
    import("@/lib/pdf/processor").then(({ processPDF }) =>
      processPDF(pdf.id, buffer).catch(async (err) => {
        console.error("[PDF Processing Error]", err);
        await import("@/repositories/pdf.repository").then(({ pdfRepository: r }) =>
          r.updateStatus(pdf.id, "FAILED", err.message)
        );
      })
    );

    return NextResponse.json(
      { success: true, data: pdf, message: "PDF uploaded to Supabase Storage. Processing started." },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
