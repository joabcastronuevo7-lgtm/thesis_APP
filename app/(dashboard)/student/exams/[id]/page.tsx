"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuizStore } from "@/store/quiz-store";
import { QuestionCard } from "@/components/quiz/question-card";
import { QuizTimer } from "@/components/quiz/quiz-timer";
import { AnswerSheet } from "@/components/quiz/answer-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { toast } from "sonner";
import type { QuestionWithChoices } from "@/types";

interface QuizData {
  attempt: { id: string };
  quiz: { id: string; title: string; timeLimit: number | null; totalQuestions: number; passingScore: number };
  questions: QuestionWithChoices[];
}

export default function TakeExamPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { setAttemptId, setQuestions, currentIndex, setCurrentIndex, answers, reset, isSubmitting, setIsSubmitting } = useQuizStore();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    reset();
    async function startAttempt() {
      try {
        const res = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId: id }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setQuizData(data.data);
        setAttemptId(data.data.attempt.id);
        setQuestions(data.data.questions);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start exam");
        router.push("/student/exams");
      } finally {
        setLoading(false);
      }
    }
    startAttempt();
  }, [id, reset, router, setAttemptId, setQuestions]);

  const handleSubmit = useCallback(async () => {
    if (!quizData) return;
    setIsSubmitting(true);

    try {
      const timeTakenSecs = Math.round((Date.now() - startTime) / 1000);
      const answersPayload = quizData.questions.map((q) => ({
        questionId: q.id,
        choiceId: answers[q.id]?.choiceId,
        textAnswer: answers[q.id]?.textAnswer,
      }));

      const res = await fetch(`/api/attempts/${quizData.attempt.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersPayload, timeTakenSecs }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      toast.success(result.message);
      router.push(`/student/results`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
      setIsSubmitting(false);
    }
  }, [quizData, answers, startTime, router, setIsSubmitting]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg">Starting exam...</span>
      </div>
    );
  }

  if (!quizData) return null;

  const { quiz, questions } = quizData;
  const answeredCount = Object.keys(answers).length;
  const progressPct = (answeredCount / questions.length) * 100;
  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Exam header */}
      <div className="sticky top-0 z-40 border-b bg-background shadow-sm">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">{quiz.title}</h1>
            <p className="text-xs text-muted-foreground">
              {answeredCount} / {questions.length} answered
            </p>
          </div>
          <div className="flex items-center gap-4">
            {quiz.timeLimit && (
              <QuizTimer timeLimitMinutes={quiz.timeLimit} onExpire={handleSubmit} />
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Exam
            </Button>
          </div>
        </div>
        <Progress value={progressPct} className="h-1" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main question */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-8">
              <QuestionCard
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={questions.length}
              />

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                  disabled={currentIndex === questions.length - 1}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Answer sheet sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">Question Navigator</h3>
              <AnswerSheet questions={questions} onNavigate={setCurrentIndex} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
