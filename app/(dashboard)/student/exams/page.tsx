import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { quizRepository } from "@/repositories/quiz.repository";
import { prisma } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, BookOpen } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

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
      <div className="p-6">
        {assignments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-16 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No exams assigned</h3>
            <p className="text-muted-foreground">Your teacher will assign exams here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map(({ quiz, assignedAt }) => {
              const attempt = attemptMap.get(quiz.id);
              const isCompleted = attempt?.status === "GRADED";
              const isInProgress = attempt?.status === "IN_PROGRESS";

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
                        {!isCompleted && (
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
