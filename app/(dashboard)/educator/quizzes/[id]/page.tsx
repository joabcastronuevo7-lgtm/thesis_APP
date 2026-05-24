import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { quizRepository } from "@/repositories/quiz.repository";
import { prisma } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublishQuizButton } from "@/components/quiz/publish-quiz-button";
import { QuizQuestionPreview } from "@/components/quiz/quiz-question-preview";
import { AssignStudentsPanel } from "@/components/quiz/assign-students-panel";
import { DeleteQuizButton } from "@/components/quiz/delete-quiz-button";
import { formatDate } from "@/lib/utils";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  ListRestart,
  Megaphone,
  Percent,
  Repeat2,
  Send,
  Shuffle,
  Timer,
  Users,
} from "lucide-react";

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "EDUCATOR"].includes(session.user.role)) {
    redirect("/login");
  }

  const { id } = await params;
  const quiz = await quizRepository.findById(id);
  if (!quiz) notFound();
  if (session.user.role === "EDUCATOR" && quiz.educatorId !== session.user.id) {
    redirect("/educator/quizzes");
  }

  const [students, assignments] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "STUDENT",
        isActive: true,
        deletedAt: null,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    prisma.examAssignment.findMany({
      where: { quizId: quiz.id },
      select: { studentId: true, dueAt: true },
    }),
  ]);

  const settingItems = [
    {
      label: "Shuffle Questions",
      value: quiz.shuffleQuestions ? "Enabled" : "Disabled",
      icon: Shuffle,
      active: quiz.shuffleQuestions,
    },
    {
      label: "Shuffle Choices",
      value: quiz.shuffleChoices ? "Enabled" : "Disabled",
      icon: ListRestart,
      active: quiz.shuffleChoices,
    },
    {
      label: "Max Attempts",
      value: `${quiz.maxAttempts}`,
      icon: Repeat2,
      active: quiz.maxAttempts > 1,
    },
    {
      label: "Time Limit",
      value: quiz.timeLimit ? `${quiz.timeLimit} minutes` : "Unlimited",
      icon: Timer,
      active: !!quiz.timeLimit,
    },
    {
      label: "Passing Score",
      value: `${quiz.passingScore}%`,
      icon: Percent,
      active: quiz.passingScore >= 60,
    },
  ];

  const teacherFlow = [
    {
      icon: CheckCircle2,
      title: "Preview Questions",
      description: "Review AI-generated questions and edit or replace items before publishing.",
    },
    {
      icon: Megaphone,
      title: "Publish Exam",
      description: "Make the exam available for assignment when the draft is ready.",
    },
    {
      icon: Send,
      title: "Assign Students",
      description: "Assign the published exam so it appears in each student's My Exams page.",
    },
    {
      icon: BarChart3,
      title: "Review Results",
      description: "Track submissions, scores, and weak topics from the reports pages.",
    },
  ];

  return (
    <div>
      <Header title={quiz.title} description={`${quiz.questions.length} questions · Created ${formatDate(quiz.createdAt)}`} />
      <div className="p-6 space-y-6">
        {/* Quiz meta */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={quiz.status === "PUBLISHED" ? "default" : "secondary"}>{quiz.status}</Badge>
          {quiz.timeLimit && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> {quiz.timeLimit} min
            </span>
          )}
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" /> {quiz._count.attempts} attempts
          </span>
          <span className="text-sm text-muted-foreground">
            Passing: {quiz.passingScore}%
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {quiz.status === "DRAFT" && <PublishQuizButton quizId={id} />}
          <DeleteQuizButton
            quizId={quiz.id}
            quizTitle={quiz.title}
            redirectTo="/educator/quizzes"
          />
        </div>

        <AssignStudentsPanel
          quizId={quiz.id}
          status={quiz.status}
          students={students}
          assignments={assignments.map((assignment) => ({
            studentId: assignment.studentId,
            dueAt: assignment.dueAt?.toISOString() ?? null,
          }))}
        />

        <Card>
          <CardContent className="p-5">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold">Teacher Publishing Flow</h2>
                <p className="text-sm text-muted-foreground">
                  This is how students receive and access exams in this system.
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {teacherFlow.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} className="relative rounded-md border bg-background p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        Step {index + 1}
                      </span>
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

        {/* Questions list */}
        <Tabs defaultValue="questions">
          <TabsList>
            <TabsTrigger value="settings">Teacher Settings</TabsTrigger>
            <TabsTrigger value="questions">Preview Questions ({quiz.questions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-3 mt-4">
            <QuizQuestionPreview
              quizId={quiz.id}
              status={quiz.status}
              questions={quiz.questions}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Exam Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {settingItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="flex min-h-20 items-center justify-between gap-3 rounded-md border bg-background p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.value}</p>
                          </div>
                        </div>
                        <Badge variant={item.active ? "default" : "secondary"} className="shrink-0">
                          {item.active ? "On" : "Off"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
