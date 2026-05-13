"use client";

import { useEffect, useRef } from "react";
import { useQuizStore } from "@/store/quiz-store";

export function useQuizTimer(timeLimitMinutes: number | null) {
  const { timeRemaining, setTimeRemaining } = useQuizStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!timeLimitMinutes) return;

    if (timeRemaining === null) {
      setTimeRemaining(timeLimitMinutes * 60);
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining(
        useQuizStore.getState().timeRemaining !== null
          ? Math.max(0, (useQuizStore.getState().timeRemaining ?? 0) - 1)
          : null
      );
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timeLimitMinutes, timeRemaining, setTimeRemaining]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return {
    timeRemaining,
    isExpired: timeRemaining !== null && timeRemaining <= 0,
    formattedTime: timeRemaining !== null ? formatTime(timeRemaining) : null,
  };
}
