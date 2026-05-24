import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { quizRepository } from "@/repositories/quiz.repository";
import { prisma } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, BookOpen, LayoutDashboard, MousePointerClick, Send, Trophy } from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";

const accessSteps = [
  {
    icon: LayoutDashboard,
    title: "Open My Exams",
    description: "Assigned exams from your teacher appear here automatically.",
  },
  {
    icon: MousePointerClick,
    title: "Choose an exam",
    description: "Check the question count, time limit, passing score, and teacher.",
  },
  {
    icon: Send,
    title: "Start or continue",
    description: "Use Take Exam or Continue to begin your self-paced attempt.",
  },
  {
    icon: Trophy,
    title: "Submit and review",
    description: "Submit your answers, then open Results once grading is complete.",
  },
];

export default async function StudentExamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [assignments, attempts] = await Promise.all([
    quizRepository.getAssignedQuizzes(session.user.id),
    prisma.studentAttempt.findMany({
      where: { studentId: session.user.id },
      select: { quizId: true, status: true, percentage: true, attemptNumber: true },
    }),
  ]);

  const attemptMap = new Map(attempts.map((a) => [a.quizId, a]));

  return (
    <div>
      <Header title="My Exams" description="View and take your assigned exams" />
      <div className="p-6 space-y-6">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="border-b bg-muted/40 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold">How to Access an Assigned Exam</h2>
                  <p className="text-sm text-muted-foreground">
                    Exams are opened from your student account after your teacher assigns them.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              {accessSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} className="rounded-md border bg-background p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {index + 1}
                      </span>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {assignments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-16 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No exams assigned</h3>
            <p className="text-muted-foreground">Your teacher will assign exams here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map(({ quiz, assignedAt, dueAt }) => {
              const attempt = attemptMap.get(quiz.id);
              const isCompleted = attempt?.status === "GRADED";
              const isInProgress = attempt?.status === "IN_PROGRESS";
              const isClosed = !!dueAt && dueAt <= new Date();

              return (
                <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{quiz.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            {quiz._count.questions} questions
                          </span>
                          {quiz.timeLimit && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {quiz.timeLimit} min
                            </span>
                          )}
                          <span>Assigned {formatDate(assignedAt)}</span>
                          {dueAt && <span>Closes {formatDateTime(dueAt)}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          By {quiz.educator.name} · Pass: {quiz.passingScore}%
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {isCompleted && (
                          <Badge variant="success">{Math.round(attempt!.percentage ?? 0)}% — Done</Badge>
                        )}
                        {isInProgress && (
                          <Badge variant="warning">In Progress</Badge>
                        )}
                        {isClosed && !isCompleted && (
                          <Badge variant="secondary">Closed</Badge>
                        )}
                        {!isCompleted && !isClosed && (
                          <Button asChild size="sm">
                            <Link href={`/student/exams/${quiz.id}`}>
                              {isInProgress ? "Continue" : "Take Exam"}
                            </Link>
                          </Button>
                        )}
                        {isCompleted && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/student/results`}>View Results</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
