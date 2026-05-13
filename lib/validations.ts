import { z } from "zod";
import { QuestionType, Difficulty } from "@prisma/client";

// ============================================================
// Auth
// ============================================================
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    role: z.enum(["EDUCATOR", "STUDENT"]).default("STUDENT"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ============================================================
// PDF
// ============================================================
export const pdfUploadSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
});

// ============================================================
// Quiz
// ============================================================
export const quizGenerationSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  pdfIds: z.array(z.string().cuid()).min(1, "Select at least one PDF"),
  totalQuestions: z.number().int().min(1).max(100),
  difficultyDistribution: z.object({
    easy: z.number().int().min(0),
    medium: z.number().int().min(0),
    hard: z.number().int().min(0),
  }),
  questionTypes: z
    .array(z.nativeEnum(QuestionType))
    .min(1, "Select at least one question type"),
  topicFilter: z.string().optional(),
  timeLimit: z.number().int().min(1).max(300).optional().nullable(),
  passingScore: z.number().int().min(0).max(100).default(60),
  shuffleQuestions: z.boolean().default(true),
  shuffleChoices: z.boolean().default(true),
  maxAttempts: z.number().int().min(1).max(10).default(1),
});

export const quizUpdateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  timeLimit: z.number().int().min(1).max(300).optional().nullable(),
  passingScore: z.number().int().min(0).max(100).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleChoices: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

// ============================================================
// Question
// ============================================================
export const questionUpdateSchema = z.object({
  text: z.string().min(5).max(2000).optional(),
  explanation: z.string().max(2000).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  topic: z.string().max(100).optional(),
  points: z.number().int().min(0).max(100).optional(),
  choices: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string().min(1).max(500),
        isCorrect: z.boolean(),
        matchKey: z.string().optional(),
        matchValue: z.string().optional(),
      })
    )
    .optional(),
});

// ============================================================
// Attempt
// ============================================================
export const attemptSubmitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().cuid(),
      choiceId: z.string().cuid().optional(),
      textAnswer: z.string().max(1000).optional(),
    })
  ),
  timeTakenSecs: z.number().int().min(0).optional(),
});

// ============================================================
// User Management (Admin)
// ============================================================
export const userUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["ADMIN", "EDUCATOR", "STUDENT"]).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// Pagination
// ============================================================
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type QuizGenerationInput = z.infer<typeof quizGenerationSchema>;
export type QuizUpdateInput = z.infer<typeof quizUpdateSchema>;
export type QuestionUpdateInput = z.infer<typeof questionUpdateSchema>;
export type AttemptSubmitInput = z.infer<typeof attemptSubmitSchema>;
