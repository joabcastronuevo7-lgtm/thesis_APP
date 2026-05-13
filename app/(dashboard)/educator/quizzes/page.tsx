import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { quizRepository } from "@/repositories/quiz.repository";
import { Header } from "@/components/dashboard/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Plus, Clock, Users } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const statusVariant = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  ARCHIVED: "outline",
  SCHEDULED: "warning",
} as const;

export default async function EducatorQuizzesPage() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
    redirect("/login");
  }

  const { data: quizzes } = await quizRepository.findMany({
    page: 1,
    pageSize: 50,
    educatorId: session.user.id,
  });

  return (
    <div>
      <Header title="My Quizzes" description={`${quizzes.length} quizzes total`} />
      <div className="p-6 space-y-4">
        <Button asChild>
          <Link href="/educator/quizzes/new">
            <Plus className="mr-2 h-4 w-4" />
            Generate New Quiz
          </Link>
        </Button>

        {quizzes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-16 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No quizzes yet</h3>
            <p className="text-muted-foreground mb-6">Generate your first AI-powered quiz from your PDFs</p>
            <Button asChild>
              <Link href="/educator/quizzes/new">Generate Quiz</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{quiz.title}</h3>
                        <Badge variant={statusVariant[quiz.status] as "default" | "secondary" | "outline"}>
                          {quiz.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{quiz._count.questions} questions</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {quiz._count.attempts} attempts
                        </span>
                        {quiz.timeLimit && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {quiz.timeLimit} min
                          </span>
                        )}
                        <span>{formatDate(quiz.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/educator/quizzes/${quiz.id}`}>Manage</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
