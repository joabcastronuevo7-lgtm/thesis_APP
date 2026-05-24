"use client";

import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExamMonitorRefreshProps {
  intervalMs?: number;
}

export function ExamMonitorRefresh({ intervalMs = 15000 }: ExamMonitorRefreshProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  useEffect(() => {
    const timer = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, refresh]);

  return (
    <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={isPending}>
      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );
}
