import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { formatDate, formatDuration, formatPercent, getScoreBadgeColor } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default async function StudentResultsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const attempts = await prisma.studentAttempt.findMany({
    where: { studentId: session.user.id, status: "GRADED" },
    orderBy: { submittedAt: "desc" },
    include: {
      quiz: { select: { id: true, title: true, passingScore: true, totalQuestions: true } },
    },
  });

  return (
    <div>
      <Header title="My Results" description={`${attempts.length} completed exams`} />
      <div className="p-6 space-y-4">
        {attempts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-16 text-center">
            <p className="text-muted-foreground">No completed exams yet.</p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/student/exams">View Assigned Exams</Link>
            </Button>
          </div>
        ) : (
          attempts.map((attempt) => {
            const pct = Math.round(attempt.percentage ?? 0);
            const passed = pct >= attempt.quiz.passingScore;
            return (
              <Card key={attempt.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{attempt.quiz.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Submitted {formatDate(attempt.submittedAt!)}
                        {attempt.timeTakenSecs && (
                          <> · <Clock className="inline h-3 w-3 mx-1" />{formatDuration(attempt.timeTakenSecs)}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getScoreBadgeColor(pct)}>{formatPercent(pct)}</Badge>
                      {passed ? (
                        <Badge variant="success" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Passed
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Failed
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Score: {Math.round(attempt.score ?? 0)} / {Math.round(attempt.maxScore ?? 0)} pts</span>
                      <span>Pass mark: {attempt.quiz.passingScore}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>

                  {attempt.feedback && (
                    <p className="mt-3 text-sm text-muted-foreground bg-muted/50 rounded p-2">
                      {attempt.feedback}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
