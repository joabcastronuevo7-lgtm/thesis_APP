"use client";

import { useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuizStore } from "@/store/quiz-store";
import { cn } from "@/lib/utils";

interface QuizTimerProps {
  timeLimitMinutes: number;
  onExpire: () => void;
}

export function QuizTimer({ timeLimitMinutes, onExpire }: QuizTimerProps) {
  const { timeRemaining, setTimeRemaining } = useQuizStore();

  useEffect(() => {
    if (timeRemaining === null) {
      setTimeRemaining(timeLimitMinutes * 60);
    }
  }, [timeLimitMinutes, timeRemaining, setTimeRemaining]);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = useQuizStore.getState().timeRemaining;
      if (current === null) return;
      if (current <= 0) {
        clearInterval(interval);
        onExpire();
        return;
      }
      setTimeRemaining(current - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [onExpire, setTimeRemaining]);

  if (timeRemaining === null) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isWarning = timeRemaining <= 300; // 5 minutes
  const isDanger = timeRemaining <= 60;   // 1 minute

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1.5 text-sm px-3 py-1.5 font-mono",
        isWarning && !isDanger && "border-yellow-500 text-yellow-600 bg-yellow-50",
        isDanger && "border-red-500 text-red-600 bg-red-50 animate-pulse"
      )}
    >
      {isDanger ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </Badge>
  );
}
