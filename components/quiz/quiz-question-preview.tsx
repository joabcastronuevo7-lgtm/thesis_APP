"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Library, Loader2, Pencil, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseJsonResponse } from "@/lib/api-response";
import { difficultyColor, difficultyLabel, questionTypeLabel } from "@/lib/utils";
import type { Choice, Difficulty, QuestionType } from "@prisma/client";

type PreviewChoice = Pick<Choice, "id" | "text" | "isCorrect" | "matchKey" | "matchValue">;

export interface PreviewQuestion {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  text: string;
  explanation: string | null;
  topic: string | null;
  keywords: string[];
  sourceContext: string | null;
  confidenceScore: number | null;
  choices: PreviewChoice[];
}

interface BankQuestion extends PreviewQuestion {
  quiz?: { id: string; title: string };
}

interface AiBankQuestion {
  type: QuestionType;
  difficulty: Difficulty;
  text: string;
  explanation: string;
  topic: string;
  keywords: string[];
  sourceContext: string;
  confidenceScore: number;
  choices: {
    text: string;
    isCorrect: boolean;
    matchKey?: string;
    matchValue?: string;
  }[];
}

interface QuizQuestionPreviewProps {
  quizId: string;
  status: string;
  questions: PreviewQuestion[];
}

const QUESTION_TYPES: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_IN_THE_BLANK",
  "MATCHING",
];

const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

function createDraft(question: PreviewQuestion) {
  return {
    text: question.text,
    type: question.type,
    difficulty: question.difficulty,
    topic: question.topic ?? "",
    explanation: question.explanation ?? "",
    choices: question.choices.map((choice) => ({
      text: choice.text,
      isCorrect: choice.isCorrect,
      matchKey: choice.matchKey ?? "",
      matchValue: choice.matchValue ?? "",
    })),
  };
}

export function QuizQuestionPreview({
  quizId,
  status,
  questions,
}: QuizQuestionPreviewProps) {
  const router = useRouter();
  const isDraft = status === "DRAFT";
  const [regenerating, setRegenerating] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<PreviewQuestion | null>(null);
  const [replacingQuestion, setReplacingQuestion] = useState<PreviewQuestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [aiBankLoading, setAiBankLoading] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [aiBankQuestions, setAiBankQuestions] = useState<AiBankQuestion[]>([]);
  const [bankSearch, setBankSearch] = useState("");

  const [editDraft, setEditDraft] = useState<ReturnType<typeof createDraft> | null>(null);

  function openEdit(question: PreviewQuestion) {
    setEditingQuestion(question);
    setEditDraft(createDraft(question));
  }

  async function regenerateQuiz() {
    setRegenerating(true);
    try {
      const response = await fetch(`/api/quizzes/${quizId}/regenerate`, {
        method: "POST",
      });
      const result = await parseJsonResponse<{ success: boolean; error?: string; message?: string }>(response);
      if (!result.success) throw new Error(result.error);
      toast.success(result.message ?? "Quiz regenerated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }

  async function saveQuestion() {
    if (!editingQuestion || !editDraft) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editDraft,
          topic: editDraft.topic || undefined,
          explanation: editDraft.explanation || undefined,
          choices: editDraft.choices,
        }),
      });
      const result = await parseJsonResponse<{ success: boolean; error?: string }>(response);
      if (!result.success) throw new Error(result.error);
      toast.success("Question updated");
      setEditingQuestion(null);
      setEditDraft(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function openBank(question: PreviewQuestion) {
    setReplacingQuestion(question);
    setBankLoading(true);
    setAiBankLoading(true);
    setBankQuestions([]);
    setAiBankQuestions([]);
    setBankSearch("");

    const aiBankRequest = fetch(`/api/questions/${question.id}/ai-bank`, {
      method: "POST",
    })
      .then((response) =>
        parseJsonResponse<{ success: boolean; error?: string; data: AiBankQuestion[] }>(response)
      )
      .then((result) => {
        if (!result.success) throw new Error(result.error);
        setAiBankQuestions(result.data);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "AI question bank failed to load");
      })
      .finally(() => setAiBankLoading(false));

    try {
      const params = new URLSearchParams({
        quizId,
        type: question.type,
        difficulty: question.difficulty,
      });
      const response = await fetch(`/api/questions/bank?${params.toString()}`);
      const result = await parseJsonResponse<{ success: boolean; error?: string; data: BankQuestion[] }>(response);
      if (!result.success) throw new Error(result.error);
      setBankQuestions(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Question bank failed to load");
    } finally {
      setBankLoading(false);
    }

    await aiBankRequest;
  }

  async function replaceQuestion(sourceQuestionId: string) {
    if (!replacingQuestion) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/questions/${replacingQuestion.id}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceQuestionId }),
      });
      const result = await parseJsonResponse<{ success: boolean; error?: string; message?: string }>(response);
      if (!result.success) throw new Error(result.error);
      toast.success(result.message ?? "Question replaced");
      setReplacingQuestion(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Replacement failed");
    } finally {
      setSaving(false);
    }
  }

  async function replaceWithAiQuestion(question: AiBankQuestion) {
    if (!replacingQuestion) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/questions/${replacingQuestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: question.type,
          difficulty: question.difficulty,
          text: question.text,
          explanation: question.explanation,
          topic: question.topic,
          choices: question.choices,
        }),
      });
      const result = await parseJsonResponse<{ success: boolean; error?: string }>(response);
      if (!result.success) throw new Error(result.error);
      toast.success("Question replaced with an AI bank alternative");
      setReplacingQuestion(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI replacement failed");
    } finally {
      setSaving(false);
    }
  }

  const filteredBankQuestions = bankQuestions.filter((question) => {
    const term = bankSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      question.text.toLowerCase().includes(term) ||
      (question.topic ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {isDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">Preview Questions</p>
            <p className="text-xs text-muted-foreground">
              Review, revise, or swap questions before publishing the exam.
            </p>
          </div>
          <Button onClick={regenerateQuiz} disabled={regenerating}>
            {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {regenerating ? "Regenerating..." : "Regenerate with AI"}
          </Button>
        </div>
      )}

      {questions.map((question, idx) => (
        <Card key={question.id} className="border">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="w-6 shrink-0 font-mono text-sm text-muted-foreground">{idx + 1}.</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 text-sm font-medium leading-relaxed">{question.text}</p>
                  {isDraft && (
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(question)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => openBank(question)}>
                        <Library className="h-4 w-4" />
                        Bank
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">{questionTypeLabel(question.type)}</Badge>
                  <Badge className={`text-xs ${difficultyColor(question.difficulty)}`}>
                    {difficultyLabel(question.difficulty)}
                  </Badge>
                  {question.topic && <Badge variant="secondary" className="text-xs">{question.topic}</Badge>}
                  {question.confidenceScore !== null && (
                    <span className="text-xs text-muted-foreground">
                      Confidence: {Math.round(question.confidenceScore * 100)}%
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1">
                  {question.choices.map((choice) => (
                    <div key={choice.id} className="flex items-center gap-2 text-sm">
                      {choice.isCorrect ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className={choice.isCorrect ? "font-medium text-green-700" : "text-muted-foreground"}>
                        {choice.text}
                      </span>
                    </div>
                  ))}
                </div>

                {question.explanation && (
                  <p className="mt-2 rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                    <strong>Explanation:</strong> {question.explanation}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Adjust the question, answer options, and answer key.</DialogDescription>
          </DialogHeader>

          {editDraft && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Question Type</Label>
                  <Select
                    value={editDraft.type}
                    onValueChange={(value) =>
                      setEditDraft({ ...editDraft, type: value as QuestionType })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{questionTypeLabel(type)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={editDraft.difficulty}
                    onValueChange={(value) =>
                      setEditDraft({ ...editDraft, difficulty: value as Difficulty })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>{difficultyLabel(difficulty)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Question</Label>
                <Textarea
                  className="mt-1"
                  rows={4}
                  value={editDraft.text}
                  onChange={(event) => setEditDraft({ ...editDraft, text: event.target.value })}
                />
              </div>

              <div>
                <Label>Topic</Label>
                <Input
                  className="mt-1"
                  value={editDraft.topic}
                  onChange={(event) => setEditDraft({ ...editDraft, topic: event.target.value })}
                />
              </div>

              <div>
                <Label>Explanation</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={editDraft.explanation}
                  onChange={(event) => setEditDraft({ ...editDraft, explanation: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Choices</Label>
                {editDraft.choices.map((choice, index) => (
                  <div key={index} className="grid grid-cols-[auto_1fr] items-center gap-2">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-accent"
                      aria-label={`Mark choice ${index + 1} correct`}
                      onClick={() =>
                        setEditDraft({
                          ...editDraft,
                          choices: editDraft.choices.map((item, itemIndex) => ({
                            ...item,
                            isCorrect:
                              editDraft.type === "MATCHING"
                                ? itemIndex === index ? !item.isCorrect : item.isCorrect
                                : itemIndex === index,
                          })),
                        })
                      }
                    >
                      {choice.isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <Input
                      value={choice.text}
                      onChange={(event) =>
                        setEditDraft({
                          ...editDraft,
                          choices: editDraft.choices.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, text: event.target.value } : item
                          ),
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>Cancel</Button>
            <Button onClick={saveQuestion} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!replacingQuestion} onOpenChange={(open) => !open && setReplacingQuestion(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select From Question Bank</DialogTitle>
            <DialogDescription>
              AI alternatives are generated using this question&apos;s {replacingQuestion ? difficultyLabel(replacingQuestion.difficulty).toLowerCase() : ""} difficulty.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">AI-Generated Bank</p>
                <p className="text-xs text-muted-foreground">
                  Fresh options matching the selected question&apos;s type and difficulty.
                </p>
              </div>
              {replacingQuestion && (
                <Badge className={difficultyColor(replacingQuestion.difficulty)}>
                  {difficultyLabel(replacingQuestion.difficulty)}
                </Badge>
              )}
            </div>
            {aiBankLoading ? (
              <div className="flex items-center justify-center rounded-md border border-dashed py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating AI bank questions...
              </div>
            ) : aiBankQuestions.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No AI alternatives were generated.
              </p>
            ) : (
              aiBankQuestions.map((question, index) => (
                <button
                  type="button"
                  key={`${question.text}-${index}`}
                  className="w-full rounded-md border p-3 text-left hover:bg-muted"
                  onClick={() => replaceWithAiQuestion(question)}
                  disabled={saving}
                >
                  <p className="text-sm font-medium">{question.text}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{questionTypeLabel(question.type)}</Badge>
                    <Badge className={difficultyColor(question.difficulty)}>
                      {difficultyLabel(question.difficulty)}
                    </Badge>
                    {question.topic && <Badge variant="secondary">{question.topic}</Badge>}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <div>
              <p className="text-sm font-medium">Saved Question Bank</p>
              <p className="text-xs text-muted-foreground">
                Reuse questions from previous quizzes with the same type and difficulty.
              </p>
            </div>
            <Input
              placeholder="Search saved questions"
              value={bankSearch}
              onChange={(event) => setBankSearch(event.target.value)}
            />

            {bankLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading saved questions...
              </div>
            ) : filteredBankQuestions.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No saved matching questions yet.
              </p>
            ) : (
              filteredBankQuestions.map((question) => (
                <button
                  type="button"
                  key={question.id}
                  className="w-full rounded-md border p-3 text-left hover:bg-muted"
                  onClick={() => replaceQuestion(question.id)}
                  disabled={saving}
                >
                  <p className="text-sm font-medium">{question.text}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {question.quiz && <Badge variant="secondary">{question.quiz.title}</Badge>}
                    {question.topic && <Badge variant="outline">{question.topic}</Badge>}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
