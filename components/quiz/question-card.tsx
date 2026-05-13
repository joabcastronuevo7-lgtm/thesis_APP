"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuizStore } from "@/store/quiz-store";
import { difficultyColor, difficultyLabel, questionTypeLabel } from "@/lib/utils";
import type { QuestionWithChoices } from "@/types";
import { QuestionType } from "@prisma/client";
import { cn } from "@/lib/utils";

// ============================================================
// Matching question — two-column select interface
// textAnswer is stored as JSON: { columnA_choiceId: columnB_choiceId }
// ============================================================
interface MatchingInputProps {
  question: QuestionWithChoices;
  currentTextAnswer?: string;
  onAnswer: (json: string) => void;
}

function MatchingInput({ question, currentTextAnswer, onAnswer }: MatchingInputProps) {
  const columnA = question.choices.filter((c) => c.matchKey?.startsWith("A"));
  const columnB = question.choices.filter((c) => c.matchKey?.startsWith("B"));

  const currentPairs: Record<string, string> = (() => {
    try {
      return currentTextAnswer ? (JSON.parse(currentTextAnswer) as Record<string, string>) : {};
    } catch {
      return {};
    }
  })();

  function setPair(aId: string, bId: string) {
    const updated = { ...currentPairs, [aId]: bId };
    onAnswer(JSON.stringify(updated));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
        <span>Column A — Term</span>
        <span>Column B — Definition</span>
      </div>
      {columnA.map((a) => (
        <div key={a.id} className="grid grid-cols-2 gap-3 items-center">
          <div className="rounded-md border bg-muted/50 px-3 py-2.5 text-sm font-medium leading-snug">
            {a.text}
          </div>
          <Select value={currentPairs[a.id] ?? ""} onValueChange={(bId) => setPair(a.id, bId)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select match…" />
            </SelectTrigger>
            <SelectContent>
              {columnB.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

interface QuestionCardProps {
  question: QuestionWithChoices;
  questionNumber: number;
  totalQuestions: number;
}

export function QuestionCard({ question, questionNumber, totalQuestions }: QuestionCardProps) {
  const { answers, setAnswer } = useQuizStore();
  const currentAnswer = answers[question.id];

  function selectChoice(choiceId: string) {
    setAnswer({ questionId: question.id, choiceId });
  }

  function setTextAnswer(text: string) {
    setAnswer({ questionId: question.id, textAnswer: text });
  }

  return (
    <div className="space-y-6">
      {/* Question header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Question {questionNumber} of {totalQuestions}
        </span>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{questionTypeLabel(question.type)}</Badge>
          <Badge className={difficultyColor(question.difficulty)}>
            {difficultyLabel(question.difficulty)}
          </Badge>
          {question.topic && (
            <Badge variant="secondary">{question.topic}</Badge>
          )}
        </div>
      </div>

      {/* Question text */}
      <div className="rounded-lg bg-muted/50 p-5">
        <p className="text-lg font-medium leading-relaxed">{question.text}</p>
      </div>

      {/* Answer input based on type */}
      {question.type === QuestionType.FILL_IN_THE_BLANK ? (
        <div>
          <Input
            placeholder="Type your answer here..."
            value={currentAnswer?.textAnswer ?? ""}
            onChange={(e) => setTextAnswer(e.target.value)}
            className="text-base"
          />
        </div>
      ) : question.type === QuestionType.MATCHING ? (
        <MatchingInput question={question} currentTextAnswer={currentAnswer?.textAnswer} onAnswer={setTextAnswer} />
      ) : (
        // MCQ and True/False
        <div className="space-y-2">
          {question.choices.map((choice, idx) => {
            const labels = ["A", "B", "C", "D"];
            const isSelected = currentAnswer?.choiceId === choice.id;
            return (
              <div
                key={choice.id}
                onClick={() => selectChoice(choice.id)}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-4 cursor-pointer transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "hover:bg-muted hover:border-muted-foreground/50"
                )}
              >
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {labels[idx] ?? idx + 1}
                </div>
                <span className="text-sm leading-relaxed">{choice.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
