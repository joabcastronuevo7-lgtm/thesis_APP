"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseJsonResponse } from "@/lib/api-response";

interface PublishQuizButtonProps {
  quizId: string;
}

export function PublishQuizButton({ quizId }: PublishQuizButtonProps) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);

  async function publishQuiz() {
    setPublishing(true);

    try {
      const response = await fetch(`/api/quizzes/${quizId}/publish`, {
        method: "POST",
      });
      const result = await parseJsonResponse<{ success: boolean; error?: string; message?: string }>(response);

      if (!result.success) {
        throw new Error(result.error ?? "Publish failed");
      }

      toast.success(result.message ?? "Quiz published successfully");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Button type="button" onClick={publishQuiz} disabled={publishing}>
      {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {publishing ? "Publishing..." : "Publish Quiz"}
    </Button>
  );
}
