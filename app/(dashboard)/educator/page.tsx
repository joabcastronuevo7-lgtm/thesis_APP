import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { FileText, BookOpen, CheckCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function EducatorDashboard() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
    redirect("/login");
  }

  const [pdfs, quizzes, attempts] = await Promise.all([
    prisma.pDF.count({ where: { uploadedById: session.user.id, deletedAt: null } }),
    prisma.quiz.findMany({
      where: { educatorId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { questions: true, attempts: true } } },
    }),
    prisma.studentAttempt.count({
      where: { quiz: { educatorId: session.user.id } },
    }),
  ]);

  const publishedQuizzes = quizzes.filter((q) => q.status === "PUBLISHED").length;

  return (
    <div>
      <Header title="Educator Dashboard" description={`Welcome back, ${session.user.name}`} />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="PDFs Uploaded" value={pdfs} icon={FileText} description="Learning materials" />
          <StatsCard title="Total Quizzes" value={quizzes.length} icon={BookOpen} description="Created quizzes" />
          <StatsCard title="Published" value={publishedQuizzes} icon={CheckCircle} description="Live exams" />
          <StatsCard title="Total Attempts" value={attempts} icon={Users} description="Student submissions" />
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/educator/quizzes/new">Generate New Quiz</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/educator/pdfs">Upload PDF</Link>
          </Button>
        </div>

        {/* Recent quizzes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Quizzes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quizzes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quizzes yet. Generate your first one!</p>
            ) : (
              quizzes.map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{quiz.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {quiz._count.questions} questions · {quiz._count.attempts} attempts · {formatDate(quiz.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={quiz.status === "PUBLISHED" ? "default" : "secondary"}>
                      {quiz.status}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/educator/quizzes/${quiz.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
