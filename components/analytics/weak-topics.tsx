"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, BookOpen } from "lucide-react";
import type { WeakTopic } from "@/types";

interface WeakTopicsProps {
  topics: WeakTopic[];
}

export function WeakTopics({ topics }: WeakTopicsProps) {
  const sorted = [...topics].sort((a, b) => b.errorRate - a.errorRate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-destructive" />
          Areas for Improvement
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No weak topics identified yet. Take more exams to see your analytics.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.slice(0, 8).map((topic) => {
              const errorPercent = Math.round(topic.errorRate * 100);
              const severity =
                errorPercent >= 70 ? "destructive" : errorPercent >= 40 ? "warning" : "secondary";
              return (
                <div key={topic.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {errorPercent >= 70 && (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium">{topic.topic}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={severity as "destructive" | "warning" | "secondary"}>
                        {errorPercent}% error rate
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {topic.attempts} attempts
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={errorPercent}
                    className="h-1.5"
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
