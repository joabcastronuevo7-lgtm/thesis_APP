import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExamMonitorRefresh } from "@/components/quiz/exam-monitor-refresh";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, MonitorCheck, Timer, Users } from "lucide-react";

export const dynamic = "force-dynamic";

function getAttemptTiming(startedAt: Date, timeLimit: number | null) {
  const elapsedSecs = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
  const remainingSecs = timeLimit ? Math.max(timeLimit * 60 - elapsedSecs, 0) : null;
  const isOverTime = remainingSecs === 0 && timeLimit !== null;

  return { elapsedSecs, remainingSecs, isOverTime };
}

export default async function EducatorMonitoringPage() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
    redirect("/login");
  }

  const quizWhere =
    session.user.role === "EDUCATOR" ? { educatorId: session.user.id } : {};

  const [activeAttempts, activeAssignments, completedToday] = await Promise.all([
    prisma.studentAttempt.findMany({
      where: {
        status: "IN_PROGRESS",
        quiz: {
          deletedAt: null,
          ...quizWhere,
        },
      },
      orderBy: { startedAt: "desc" },
      include: {
        student: { select: { id: true, name: true, email: true } },
        quiz: {
          select: {
            id: true,
            title: true,
            timeLimit: true,
            totalQuestions: true,
            passingScore: true,
          },
        },
      },
    }),
    prisma.examAssignment.count({
      where: {
        quiz: {
          deletedAt: null,
          status: "PUBLISHED",
          ...quizWhere,
        },
      },
    }),
    prisma.studentAttempt.count({
      where: {
        status: "GRADED",
        submittedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
        quiz: {
          deletedAt: null,
          ...quizWhere,
        },
      },
    }),
  ]);

  const timedActive = activeAttempts.filter((attempt) => attempt.quiz.timeLimit).length;
  const overTimeCount = activeAttempts.filter((attempt) =>
    getAttemptTiming(attempt.startedAt, attempt.quiz.timeLimit).isOverTime
  ).length;

  return (
    <div>
      <Header
        title="Exam Monitoring"
        description="Monitor students who are currently taking assigned exams"
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Auto-refreshes every 15 seconds. Last checked {formatDateTime(new Date())}.
          </div>
          <ExamMonitorRefresh />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Taking Now" value={activeAttempts.length} icon={MonitorCheck} color="green" />
          <StatsCard title="Timed Exams" value={timedActive} icon={Timer} color="blue" />
          <StatsCard title="Assignments" value={activeAssignments} icon={Users} color="purple" />
          <StatsCard title="Completed Today" value={completedToday} icon={CheckCircle2} color="orange" />
        </div>

        {overTimeCount > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {overTimeCount} active attempt{overTimeCount === 1 ? "" : "s"} reached the time limit.
                </p>
                <p className="text-sm text-muted-foreground">
                  These will close when the student refreshes, reopens, or tries to submit.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MonitorCheck className="h-4 w-4 text-primary" />
              Active Exam Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeAttempts.length === 0 ? (
              <div className="rounded-md border border-dashed p-10 text-center">
                <MonitorCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="font-semibold">No students taking exams right now</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Active attempts will appear here as soon as students start an assigned exam.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAttempts.map((attempt) => {
                  const timing = getAttemptTiming(attempt.startedAt, attempt.quiz.timeLimit);
                  const remainingLabel =
                    timing.remainingSecs === null
                      ? "Unlimited"
                      : formatDuration(timing.remainingSecs);

                  return (
                    <div
                      key={attempt.id}
                      className="grid gap-4 rounded-md border p-4 md:grid-cols-[1.2fr_1.4fr_auto]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{attempt.student.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{attempt.student.email}</p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{attempt.quiz.title}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{attempt.quiz.totalQuestions} questions</span>
                          <span>Pass: {attempt.quiz.passingScore}%</span>
                          <span>Attempt {attempt.attemptNumber}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <Badge variant={timing.isOverTime ? "destructive" : "default"}>
                          {timing.isOverTime ? "Over time" : "In progress"}
                        </Badge>
                        <Badge variant="outline" className="gap-1 font-mono">
                          <Clock className="h-3.5 w-3.5" />
                          {remainingLabel}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Started {formatDateTime(attempt.startedAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
