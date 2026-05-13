"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quizGenerationSchema, type QuizGenerationInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { QuestionType } from "@prisma/client";

interface PDF {
  id: string;
  title: string;
  status: string;
}

interface QuizBuilderProps {
  pdfs: PDF[];
}

const QUESTION_TYPES = [
  { value: QuestionType.MULTIPLE_CHOICE, label: "Multiple Choice" },
  { value: QuestionType.TRUE_FALSE, label: "True / False" },
  { value: QuestionType.FILL_IN_THE_BLANK, label: "Fill in the Blank" },
  { value: QuestionType.MATCHING, label: "Matching" },
];

export function QuizBuilder({ pdfs }: QuizBuilderProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [selectedPDFs, setSelectedPDFs] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    QuestionType.MULTIPLE_CHOICE,
  ]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<QuizGenerationInput>({
    resolver: zodResolver(quizGenerationSchema),
    defaultValues: {
      totalQuestions: 10,
      difficultyDistribution: { easy: 3, medium: 5, hard: 2 },
      passingScore: 60,
      shuffleQuestions: true,
      shuffleChoices: true,
      maxAttempts: 1,
    },
  });

  const totalQuestions = watch("totalQuestions") || 10;
  const easy = watch("difficultyDistribution.easy") || 0;
  const medium = watch("difficultyDistribution.medium") || 0;
  const hard = watch("difficultyDistribution.hard") || 0;
  const distributionValid = easy + medium + hard === totalQuestions;

  function togglePDF(id: string) {
    setSelectedPDFs((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function toggleType(type: QuestionType) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function onSubmit(data: QuizGenerationInput) {
    if (selectedPDFs.length === 0) {
      toast.error("Select at least one PDF");
      return;
    }
    if (selectedTypes.length === 0) {
      toast.error("Select at least one question type");
      return;
    }
    if (!distributionValid) {
      toast.error(`Difficulty totals must equal ${totalQuestions}`);
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          pdfIds: selectedPDFs,
          questionTypes: selectedTypes,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      toast.success(result.message);
      router.push(`/educator/quizzes/${result.data.quizId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  const processedPDFs = pdfs.filter((p) => p.status === "PROCESSED");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Quiz Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Quiz Title *</Label>
            <Input id="title" {...register("title")} placeholder="e.g., Midterm Exam - Chapter 3" className="mt-1" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} placeholder="Optional description" className="mt-1" rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* PDF Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Source PDFs *</CardTitle>
        </CardHeader>
        <CardContent>
          {processedPDFs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No processed PDFs available. Upload and process PDFs first.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {processedPDFs.map((pdf) => (
                <div
                  key={pdf.id}
                  onClick={() => togglePDF(pdf.id)}
                  className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                    selectedPDFs.includes(pdf.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className={`h-4 w-4 rounded border-2 flex-shrink-0 ${selectedPDFs.includes(pdf.id) ? "bg-primary border-primary" : "border-muted-foreground"}`} />
                  <span className="text-sm font-medium">{pdf.title}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Types */}
      <Card>
        <CardHeader>
          <CardTitle>Question Types *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((type) => (
              <Badge
                key={type.value}
                variant={selectedTypes.includes(type.value) ? "default" : "outline"}
                className="cursor-pointer text-sm py-1.5 px-3"
                onClick={() => toggleType(type.value)}
              >
                {type.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Difficulty Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total Questions</Label>
              <Input type="number" {...register("totalQuestions", { valueAsNumber: true })} min={1} max={100} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-green-600">Easy</Label>
              <Input type="number" {...register("difficultyDistribution.easy", { valueAsNumber: true })} min={0} className="mt-1" />
            </div>
            <div>
              <Label className="text-yellow-600">Medium</Label>
              <Input type="number" {...register("difficultyDistribution.medium", { valueAsNumber: true })} min={0} className="mt-1" />
            </div>
            <div>
              <Label className="text-red-600">Hard</Label>
              <Input type="number" {...register("difficultyDistribution.hard", { valueAsNumber: true })} min={0} className="mt-1" />
            </div>
          </div>
          <p className={`text-sm ${distributionValid ? "text-green-600" : "text-destructive"}`}>
            Total: {easy + medium + hard} / {totalQuestions} {distributionValid ? "✓" : "(must equal total)"}
          </p>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Time Limit (minutes)</Label>
              <Input type="number" {...register("timeLimit", { valueAsNumber: true })} placeholder="Leave empty for unlimited" className="mt-1" />
            </div>
            <div>
              <Label>Passing Score (%)</Label>
              <Input type="number" {...register("passingScore", { valueAsNumber: true })} min={0} max={100} className="mt-1" />
            </div>
            <div>
              <Label>Max Attempts</Label>
              <Input type="number" {...register("maxAttempts", { valueAsNumber: true })} min={1} max={10} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={generating} className="w-full" size="lg">
        {generating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating Questions with AI...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Generate Quiz with AI
          </>
        )}
      </Button>
    </form>
  );
}
