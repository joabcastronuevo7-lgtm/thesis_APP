import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { analyticsRepository } from "@/repositories/analytics.repository";
import { Header } from "@/components/dashboard/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  CheckCircle,
  ClipboardList,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [stats, recentAttempts, recentQuizzes] = await Promise.all([
    analyticsRepository.getAdminStats(),
    prisma.studentAttempt.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        student: { select: { name: true, email: true } },
        quiz: { select: { title: true, passingScore: true } },
      },
    }),
    prisma.quiz.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        educator: { select: { name: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    }),
  ]);

  const gradedAttempts = recentAttempts.filter((attempt) => attempt.status === "GRADED");
  const averageScore =
    gradedAttempts.length > 0
      ? Math.round(
          gradedAttempts.reduce((sum, attempt) => sum + (attempt.percentage ?? 0), 0) /
            gradedAttempts.length
        )
      : 0;

  return (
    <div>
      <Header
        title="Platform Analytics"
        description="Monitor quiz activity, content growth, and recent student performance"
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Users" value={stats.totalUsers} icon={Users} color="blue" />
          <StatsCard title="PDFs Uploaded" value={stats.totalPDFs} icon={FileText} color="purple" />
          <StatsCard title="Quizzes" value={stats.totalQuizzes} icon={BookOpen} color="green" />
          <StatsCard title="Attempts" value={stats.totalAttempts} icon={ClipboardList} color="orange" />
          <StatsCard title="Recent Avg Score" value={`${averageScore}%`} icon={TrendingUp} color="default" />
          <StatsCard title="Students" value={stats.totalStudents} icon={CheckCircle} color="green" />
          <StatsCard title="Educators" value={stats.totalEducators} icon={BarChart3} color="blue" />
          <StatsCard title="Admins" value={stats.totalAdmins} icon={Users} color="red" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Attempts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAttempts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attempts submitted yet.</p>
              ) : (
                recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{attempt.quiz.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {attempt.student.name} - {formatDate(attempt.createdAt)}
                      </p>
                    </div>
                    <Badge variant={attempt.status === "GRADED" ? "default" : "secondary"}>
                      {attempt.percentage == null ? attempt.status : `${Math.round(attempt.percentage)}%`}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Quizzes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentQuizzes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No quizzes created yet.</p>
              ) : (
                recentQuizzes.map((quiz) => (
                  <div key={quiz.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{quiz.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {quiz.educator.name} - {quiz._count.questions} questions - {quiz._count.attempts} attempts
                      </p>
                    </div>
                    <Badge variant={quiz.status === "PUBLISHED" ? "default" : "secondary"}>
                      {quiz.status}
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
