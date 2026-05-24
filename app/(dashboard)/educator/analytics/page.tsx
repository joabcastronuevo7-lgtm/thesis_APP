import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Award, BookOpen, CheckCircle, ClipboardList, Target, TrendingUp } from "lucide-react";

export default async function EducatorAnalyticsPage() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) redirect("/login");

  const quizzes = await prisma.quiz.findMany({
    where: {
      deletedAt: null,
      ...(session.user.role === "EDUCATOR" ? { educatorId: session.user.id } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      attempts: {
        where: { status: "GRADED" },
        include: { student: { select: { name: true, email: true } } },
      },
      _count: { select: { questions: true, attempts: true } },
    },
  });

  const attempts = quizzes.flatMap((quiz) =>
    quiz.attempts.map((attempt) => ({
      ...attempt,
      quizTitle: quiz.title,
      passingScore: quiz.passingScore,
    }))
  );

  const averageScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((sum, attempt) => sum + (attempt.percentage ?? 0), 0) / attempts.length)
      : 0;
  const bestScore =
    attempts.length > 0 ? Math.round(Math.max(...attempts.map((attempt) => attempt.percentage ?? 0))) : 0;
  const passRate =
    attempts.length > 0
      ? Math.round(
          (attempts.filter((attempt) => (attempt.percentage ?? 0) >= attempt.passingScore).length /
            attempts.length) *
            100
        )
      : 0;
  const publishedQuizzes = quizzes.filter((quiz) => quiz.status === "PUBLISHED").length;
  const recentAttempts = attempts
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);

  return (
    <div>
      <Header
        title="Quiz Analytics"
        description="Review student submissions and performance across your quizzes"
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Quizzes" value={quizzes.length} icon={BookOpen} color="purple" />
          <StatsCard title="Published" value={publishedQuizzes} icon={CheckCircle} color="green" />
          <StatsCard title="Graded Attempts" value={attempts.length} icon={ClipboardList} color="orange" />
          <StatsCard title="Average Score" value={`${averageScore}%`} icon={TrendingUp} color="blue" />
          <StatsCard title="Best Score" value={`${bestScore}%`} icon={Award} color="green" />
          <StatsCard title="Pass Rate" value={`${passRate}%`} icon={Target} color="default" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quizzes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No quizzes created yet.</p>
              ) : (
                quizzes.slice(0, 10).map((quiz) => {
                  const quizAttempts = quiz.attempts;
                  const quizAverage =
                    quizAttempts.length > 0
                      ? Math.round(
                          quizAttempts.reduce((sum, attempt) => sum + (attempt.percentage ?? 0), 0) /
                            quizAttempts.length
                        )
                      : 0;

                  return (
                    <div key={quiz.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{quiz.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {quiz._count.questions} questions - {quiz._count.attempts} attempts
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={quiz.status === "PUBLISHED" ? "default" : "secondary"}>
                          {quiz.status}
                        </Badge>
                        <Badge variant="outline">{quizAverage}% avg</Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Graded Attempts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAttempts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No graded attempts yet.</p>
              ) : (
                recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{attempt.quizTitle}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {attempt.student.name} - {formatDate(attempt.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        (attempt.percentage ?? 0) >= attempt.passingScore ? "success" : "destructive"
                      }
                    >
                      {Math.round(attempt.percentage ?? 0)}%
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
