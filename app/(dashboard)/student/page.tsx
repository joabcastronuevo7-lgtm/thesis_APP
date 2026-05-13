import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { WeakTopics } from "@/components/analytics/weak-topics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, CheckCircle, TrendingUp, Award } from "lucide-react";
import Link from "next/link";
import { formatDate, formatPercent, getScoreBadgeColor } from "@/lib/utils";

export default async function StudentDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [assignments, attempts, weakTopics] = await Promise.all([
    prisma.examAssignment.count({ where: { studentId: session.user.id } }),
    prisma.studentAttempt.findMany({
      where: { studentId: session.user.id, status: "GRADED" },
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: { quiz: { select: { title: true, passingScore: true } } },
    }),
    prisma.weakTopic.findMany({
      where: { studentId: session.user.id },
      orderBy: { errorRate: "desc" },
      take: 5,
    }),
  ]);

  const avgScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / attempts.length)
      : 0;
  const bestScore = attempts.length > 0
    ? Math.round(Math.max(...attempts.map((a) => a.percentage ?? 0)))
    : 0;

  return (
    <div>
      <Header title="Student Dashboard" description={`Welcome, ${session.user.name}`} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Assigned Exams" value={assignments} icon={ClipboardList} />
          <StatsCard title="Completed" value={attempts.length} icon={CheckCircle} />
          <StatsCard title="Average Score" value={`${avgScore}%`} icon={TrendingUp} />
          <StatsCard title="Best Score" value={`${bestScore}%`} icon={Award} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent attempts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Attempts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {attempts.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">No completed exams yet.</p>
                  <Button variant="outline" size="sm" asChild className="mt-3">
                    <Link href="/student/exams">View Assigned Exams</Link>
                  </Button>
                </div>
              ) : (
                attempts.map((attempt) => {
                  const pct = Math.round(attempt.percentage ?? 0);
                  const passed = pct >= attempt.quiz.passingScore;
                  return (
                    <div key={attempt.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">{attempt.quiz.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(attempt.submittedAt!)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getScoreBadgeColor(pct)}>{formatPercent(pct)}</Badge>
                        <Badge variant={passed ? "success" : "destructive"} className="text-xs">
                          {passed ? "Passed" : "Failed"}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Weak topics */}
          <WeakTopics topics={weakTopics} />
        </div>
      </div>
    </div>
  );
}
