import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { pdfRepository } from "@/repositories/pdf.repository";
import { Header } from "@/components/dashboard/header";
import { PdfUpload } from "@/components/pdf/pdf-upload";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/utils";

const statusIcon = {
  PENDING: <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />,
  PROCESSING: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  PROCESSED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  FAILED: <XCircle className="h-4 w-4 text-destructive" />,
};

const statusVariant = {
  PENDING: "secondary",
  PROCESSING: "default",
  PROCESSED: "success",
  FAILED: "destructive",
} as const;

export default async function EducatorPDFsPage() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
    redirect("/login");
  }

  const { data: pdfs } = await pdfRepository.findMany({
    page: 1,
    pageSize: 50,
    uploadedById: session.user.id,
  });

  return (
    <div>
      <Header title="PDF Library" description="Upload and manage your learning materials" />
      <div className="p-6 space-y-6">
        {/* Upload section */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Upload New PDF</h2>
            <PdfUpload />
          </CardContent>
        </Card>

        {/* PDF list */}
        <div>
          <h2 className="font-semibold mb-3">Your PDFs ({pdfs.length})</h2>
          {pdfs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No PDFs uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pdfs.map((pdf) => (
                <div key={pdf.id} className="flex items-center gap-4 rounded-lg border bg-card p-4">
                  <FileText className="h-8 w-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{pdf.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {pdf.fileName} · {formatFileSize(pdf.fileSize)} · {formatDate(pdf.createdAt)}
                    </p>
                    {pdf.errorMessage && (
                      <p className="text-xs text-destructive mt-1">{pdf.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcon[pdf.status]}
                    <Badge variant={statusVariant[pdf.status]}>
                      {pdf.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
