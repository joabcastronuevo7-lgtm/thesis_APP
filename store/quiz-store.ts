import { create } from "zustand";
import type { QuestionWithChoices } from "@/types";

interface QuizAnswer {
  questionId: string;
  choiceId?: string;
  textAnswer?: string;
}

interface QuizState {
  attemptId: string | null;
  questions: QuestionWithChoices[];
  answers: Record<string, QuizAnswer>;
  currentIndex: number;
  timeRemaining: number | null;
  isSubmitting: boolean;

  setAttemptId: (id: string) => void;
  setQuestions: (questions: QuestionWithChoices[]) => void;
  setAnswer: (answer: QuizAnswer) => void;
  setCurrentIndex: (index: number) => void;
  setTimeRemaining: (time: number | null) => void;
  setIsSubmitting: (value: boolean) => void;
  reset: () => void;
}

const initialState = {
  attemptId: null,
  questions: [],
  answers: {},
  currentIndex: 0,
  timeRemaining: null,
  isSubmitting: false,
};

export const useQuizStore = create<QuizState>()((set) => ({
  ...initialState,
  setAttemptId: (id) => set({ attemptId: id }),
  setQuestions: (questions) => set({ questions }),
  setAnswer: (answer) =>
    set((state) => ({
      answers: { ...state.answers, [answer.questionId]: answer },
    })),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  setIsSubmitting: (value) => set({ isSubmitting: value }),
  reset: () => set(initialState),
}));
