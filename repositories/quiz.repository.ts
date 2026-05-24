import { prisma } from "@/lib/db";
import type { QuizStatus } from "@prisma/client";
import type { GeneratedQuestion } from "@/types";

export const quizRepository = {
  async findById(id: string) {
    return prisma.quiz.findUnique({
      where: { id, deletedAt: null },
      include: {
        educator: { select: { id: true, name: true, email: true } },
        questions: {
          orderBy: { order: "asc" },
          include: { choices: { orderBy: { order: "asc" } } },
        },
        pdfs: { include: { pdf: true } },
        _count: { select: { attempts: true, questions: true } },
      },
    });
  },

  async findMany(params: {
    page: number;
    pageSize: number;
    educatorId?: string;
    status?: QuizStatus;
    search?: string;
  }) {
    const { page, pageSize, educatorId, status, search } = params;
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: null,
      ...(educatorId && { educatorId }),
      ...(status && { status }),
      ...(search && {
        title: { contains: search, mode: "insensitive" as const },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          educator: { select: { id: true, name: true } },
          _count: { select: { questions: true, attempts: true } },
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    return { data, total };
  },

  async create(data: {
    title: string;
    description?: string;
    educatorId: string;
    timeLimit?: number | null;
    passingScore?: number;
    shuffleQuestions?: boolean;
    shuffleChoices?: boolean;
    maxAttempts?: number;
  }) {
    return prisma.quiz.create({ data });
  },

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    status: QuizStatus;
    timeLimit: number | null;
    passingScore: number;
    shuffleQuestions: boolean;
    shuffleChoices: boolean;
    maxAttempts: number;
    totalQuestions: number;
    scheduledAt: Date | null;
    expiresAt: Date | null;
  }>) {
    return prisma.quiz.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.examAssignment.deleteMany({ where: { quizId: id } });

      return tx.quiz.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  },

  async addPDFs(quizId: string, pdfIds: string[]) {
    await prisma.quizPDF.createMany({
      data: pdfIds.map((pdfId) => ({ quizId, pdfId })),
      skipDuplicates: true,
    });
  },

  async saveGeneratedQuestions(
    quizId: string,
    questions: GeneratedQuestion[],
    chunkIdMap: Record<string, string>
  ) {
    const validChunkIds = new Set(
      (
        await prisma.extractedChunk.findMany({
          where: { id: { in: Object.values(chunkIdMap) } },
          select: { id: true },
        })
      ).map((chunk) => chunk.id)
    );

    const questionRecords = await Promise.all(
      questions.map(async (q, index) => {
        const chunkId = chunkIdMap[q.sourceContext?.trim().slice(0, 50) ?? ""];
        const question = await prisma.question.create({
          data: {
            quizId,
            type: q.type,
            difficulty: q.difficulty,
            text: q.text,
            explanation: q.explanation,
            topic: q.topic,
            keywords: q.keywords,
            sourceContext: q.sourceContext,
            confidenceScore: q.confidenceScore,
            order: index,
            chunkId: chunkId && validChunkIds.has(chunkId) ? chunkId : null,
          },
        });

        await prisma.choice.createMany({
          data: q.choices.map((c, ci) => ({
            questionId: question.id,
            text: c.text,
            isCorrect: c.isCorrect,
            matchKey: c.matchKey,
            matchValue: c.matchValue,
            order: ci,
          })),
        });

        return question;
      })
    );

    await prisma.quiz.update({
      where: { id: quizId },
      data: { totalQuestions: questionRecords.length },
    });

    return questionRecords;
  },

  async replaceGeneratedQuestions(
    quizId: string,
    questions: GeneratedQuestion[],
    chunkIdMap: Record<string, string>
  ) {
    await prisma.question.deleteMany({ where: { quizId } });
    return this.saveGeneratedQuestions(quizId, questions, chunkIdMap);
  },

  async getAssignedQuizzes(studentId: string) {
    return prisma.examAssignment.findMany({
      where: { studentId, quiz: { deletedAt: null, status: "PUBLISHED" } },
      orderBy: { assignedAt: "desc" },
      include: {
        quiz: {
          include: {
            educator: { select: { id: true, name: true } },
            _count: { select: { questions: true } },
          },
        },
      },
    });
  },

  async assignToStudents(
    quizId: string,
    studentIds: string[],
    educatorId: string,
    dueAt?: Date | null
  ) {
    await prisma.examAssignment.createMany({
      data: studentIds.map((studentId) => ({ quizId, studentId, educatorId, dueAt })),
      skipDuplicates: true,
    });
  },
};
