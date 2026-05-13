"use client";

import { useQuizStore } from "@/store/quiz-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";
import type { QuestionWithChoices } from "@/types";

interface AnswerSheetProps {
  questions: QuestionWithChoices[];
  onNavigate: (index: number) => void;
}

export function AnswerSheet({ questions, onNavigate }: AnswerSheetProps) {
  const { answers, currentIndex } = useQuizStore();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground mb-3">
        {Object.keys(answers).length} / {questions.length} answered
      </p>
      <div className="grid grid-cols-5 gap-1">
        {questions.map((q, index) => {
          const isAnswered = !!answers[q.id];
          const isCurrent = currentIndex === index;
          return (
            <button
              key={q.id}
              onClick={() => onNavigate(index)}
              className={cn(
                "h-9 w-full rounded text-xs font-medium transition-colors",
                isCurrent && "ring-2 ring-primary ring-offset-1",
                isAnswered
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
