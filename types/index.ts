import type {
  User,
  PDF,
  Quiz,
  Question,
  Choice,
  StudentAttempt,
  StudentAnswer,
  WeakTopic,
  Analytics,
  ExtractedChunk,
  Role,
  PDFStatus,
  QuizStatus,
  QuestionType,
  Difficulty,
  AttemptStatus,
} from "@prisma/client";

// ============================================================
// Re-exports from Prisma
// ============================================================
export type {
  User,
  PDF,
  Quiz,
  Question,
  Choice,
  StudentAttempt,
  StudentAnswer,
  WeakTopic,
  Analytics,
  ExtractedChunk,
  Role,
  PDFStatus,
  QuizStatus,
  QuestionType,
  Difficulty,
  AttemptStatus,
};

// ============================================================
// Auth
// ============================================================
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  image?: string | null;
}

// ============================================================
// API Response Wrappers
// ============================================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// PDF Types
// ============================================================
export interface PDFWithChunks extends PDF {
  chunks: ExtractedChunk[];
  uploadedBy: Pick<User, "id" | "name" | "email">;
  _count: { chunks: number };
}

export interface PDFUploadResult {
  pdf: PDF;
  chunksCreated: number;
  vectorsStored: number;
}

// ============================================================
// Quiz Types
// ============================================================
export interface QuizGenerationConfig {
  pdfIds: string[];
  totalQuestions: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  questionTypes: QuestionType[];
  topicFilter?: string;
  title: string;
  description?: string;
  timeLimit?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
  maxAttempts?: number;
}

export interface QuizWithQuestions extends Quiz {
  questions: QuestionWithChoices[];
  educator: Pick<User, "id" | "name" | "email">;
  _count: { attempts: number; questions: number };
}

export interface QuizSummary extends Quiz {
  _count: { questions: number; attempts: number };
  educator: Pick<User, "id" | "name">;
}

// ============================================================
// Question Types
// ============================================================
export interface QuestionWithChoices extends Question {
  choices: Choice[];
  chunk?: Pick<ExtractedChunk, "id" | "content" | "topics"> | null;
}

export interface GeneratedQuestion {
  type: QuestionType;
  difficulty: Difficulty;
  text: string;
  explanation: string;
  topic: string;
  keywords: string[];
  choices: {
    text: string;
    isCorrect: boolean;
    matchKey?: string;
    matchValue?: string;
  }[];
  sourceContext: string;
  confidenceScore: number;
}

// ============================================================
// Attempt Types
// ============================================================
export interface AttemptWithAnswers extends StudentAttempt {
  answers: (StudentAnswer & {
    question: QuestionWithChoices;
    choice: Choice | null;
  })[];
  student: Pick<User, "id" | "name" | "email">;
  quiz: Pick<Quiz, "id" | "title" | "totalQuestions" | "passingScore">;
}

export interface AttemptSubmission {
  answers: {
    questionId: string;
    choiceId?: string;
    textAnswer?: string;
  }[];
  timeTakenSecs?: number;
}

// ============================================================
// Analytics Types
// ============================================================
export interface StudentPerformance {
  student: Pick<User, "id" | "name" | "email">;
  totalAttempts: number;
  avgScore: number;
  bestScore: number;
  passRate: number;
  weakTopics: WeakTopic[];
  recentAttempts: StudentAttempt[];
}

export interface QuizAnalytics extends Analytics {
  quiz: Pick<Quiz, "id" | "title">;
  questionStats: QuestionStat[];
  topicStats: TopicStat[];
}

export interface QuestionStat {
  questionId: string;
  questionText: string;
  difficulty: Difficulty;
  topic: string | null;
  correctCount: number;
  totalAnswers: number;
  correctRate: number;
}

export interface TopicStat {
  topic: string;
  correctRate: number;
  questionCount: number;
  avgDifficulty: string;
}

// ============================================================
// RAG Types
// ============================================================
export interface RetrievedChunk {
  id: string;
  content: string;
  score: number;
  topics: string[];
  keywords: string[];
  pdfId: string;
  chunkIndex: number;
}

export interface RAGContext {
  chunks: RetrievedChunk[];
  query: string;
  pdfIds: string[];
}

// ============================================================
// Dashboard Stats
// ============================================================
export interface AdminStats {
  totalUsers: number;
  totalEducators: number;
  totalStudents: number;
  totalPDFs: number;
  totalQuizzes: number;
  totalAttempts: number;
  activeUsers: number;
}

export interface EducatorStats {
  totalPDFs: number;
  totalQuizzes: number;
  publishedQuizzes: number;
  totalStudentAttempts: number;
  avgScore: number;
}

export interface StudentStats {
  assignedExams: number;
  completedExams: number;
  avgScore: number;
  bestScore: number;
  weakTopics: WeakTopic[];
}
