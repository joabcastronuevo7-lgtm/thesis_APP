"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { parseJsonResponse } from "@/lib/api-response";

interface DeleteQuizButtonProps {
  quizId: string;
  quizTitle: string;
  redirectTo?: string;
  size?: "default" | "sm";
}

export function DeleteQuizButton({
  quizId,
  quizTitle,
  redirectTo,
  size = "default",
}: DeleteQuizButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteQuiz() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: "DELETE",
      });
      const result = await parseJsonResponse<{ success: boolean; error?: string; message?: string }>(response);
      if (!result.success) throw new Error(result.error);

      toast.success(result.message ?? "Quiz deleted");
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size={size}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Quiz</DialogTitle>
          <DialogDescription>
            Delete &quot;{quizTitle}&quot; from your quiz list. This is meant for drafts or exams created by mistake.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={deleteQuiz} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete Quiz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
