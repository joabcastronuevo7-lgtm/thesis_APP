import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { quizRepository } from "@/repositories/quiz.repository";
import { Header } from "@/components/dashboard/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { difficultyColor, difficultyLabel, questionTypeLabel, formatDate } from "@/lib/utils";
import { CheckCircle2, Circle, Clock, Users } from "lucide-react";

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
        {quiz.status === "DRAFT" && (
          <div className="flex gap-3">
            <form action={`/api/quizzes/${id}/publish`} method="POST">
              <Button type="submit">Publish Quiz</Button>
            </form>
          </div>
        )}

        {/* Questions list */}
        <Tabs defaultValue="questions">
          <TabsList>
            <TabsTrigger value="questions">Questions ({quiz.questions.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-3 mt-4">
            {quiz.questions.map((q, idx) => (
              <Card key={q.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-muted-foreground text-sm font-mono w-6 shrink-0">{idx + 1}.</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm leading-relaxed">{q.text}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{questionTypeLabel(q.type)}</Badge>
                        <Badge className={`text-xs ${difficultyColor(q.difficulty)}`}>
                          {difficultyLabel(q.difficulty)}
                        </Badge>
                        {q.topic && <Badge variant="secondary" className="text-xs">{q.topic}</Badge>}
                        {q.confidenceScore !== null && (
                          <span className="text-xs text-muted-foreground">
                            Confidence: {Math.round((q.confidenceScore ?? 0) * 100)}%
                          </span>
                        )}
                      </div>
                      {/* Choices */}
                      <div className="mt-3 space-y-1">
                        {q.choices.map((choice) => (
                          <div key={choice.id} className="flex items-center gap-2 text-sm">
                            {choice.isCorrect ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className={choice.isCorrect ? "text-green-700 font-medium" : "text-muted-foreground"}>
                              {choice.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Shuffle Questions:</span> {quiz.shuffleQuestions ? "Yes" : "No"}</div>
                  <div><span className="text-muted-foreground">Shuffle Choices:</span> {quiz.shuffleChoices ? "Yes" : "No"}</div>
                  <div><span className="text-muted-foreground">Max Attempts:</span> {quiz.maxAttempts}</div>
                  <div><span className="text-muted-foreground">Time Limit:</span> {quiz.timeLimit ? `${quiz.timeLimit} minutes` : "Unlimited"}</div>
                  <div><span className="text-muted-foreground">Passing Score:</span> {quiz.passingScore}%</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
