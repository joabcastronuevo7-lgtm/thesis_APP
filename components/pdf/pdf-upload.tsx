"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn, formatFileSize } from "@/lib/utils";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api-response";

interface PdfUploadProps {
  onSuccess?: () => void;
}

export function PdfUpload({ onSuccess }: PdfUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted: File[]) => {
    const pdf = accepted[0];
    if (pdf) {
      setFile(pdf);
      setTitle(pdf.name.replace(".pdf", ""));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    useFsAccessApi: false,
    onDropRejected: () => toast.error("Invalid file. Only PDFs up to 50MB allowed."),
  });

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setProgress(10);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name.replace(".pdf", ""));

    try {
      setProgress(40);
      const response = await fetch("/api/pdfs", {
        method: "POST",
        body: formData,
      });

      setProgress(80);
      const data = await parseJsonResponse<{ success: boolean; error?: string }>(response);

      if (!data.success) throw new Error(data.error);

      setProgress(100);
      toast.success("PDF uploaded! Processing started in the background.");
      setFile(null);
      setTitle("");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div>
            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium">Drop your PDF here, or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">Maximum file size: 50MB</p>
          </div>
        )}
      </div>

      {file && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="pdf-title">Document Title</Label>
            <Input
              id="pdf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title"
              className="mt-1"
            />
          </div>

          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">Uploading...</p>
            </div>
          )}

          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload PDF
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
