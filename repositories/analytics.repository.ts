import { prisma } from "@/lib/db";

export const analyticsRepository = {
  async getStudentAttempts(studentId: string) {
    return prisma.studentAttempt.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      include: {
        quiz: { select: { id: true, title: true, passingScore: true, totalQuestions: true } },
        answers: {
          include: {
            question: {
              select: { id: true, topic: true, difficulty: true, text: true },
            },
          },
        },
      },
    });
  },

  async getQuizAttempts(quizId: string) {
    return prisma.studentAttempt.findMany({
      where: { quizId, status: "GRADED" },
      include: {
        student: { select: { id: true, name: true, email: true } },
        answers: {
          include: {
            question: { select: { id: true, topic: true, difficulty: true } },
          },
        },
      },
    });
  },

  async getWeakTopics(studentId: string) {
    return prisma.weakTopic.findMany({
      where: { studentId },
      orderBy: { errorRate: "desc" },
    });
  },

  async upsertWeakTopic(
    studentId: string,
    topic: string,
    isCorrect: boolean,
    quizId?: string
  ) {
    const existing = await prisma.weakTopic.findUnique({
      where: { studentId_topic: { studentId, topic } },
    });

    if (existing) {
      const newAttempts = existing.attempts + 1;
      // Reconstruct raw error count without intermediate rounding to avoid drift
      const totalErrors = existing.errorRate * existing.attempts + (isCorrect ? 0 : 1);
      const newErrorRate = totalErrors / newAttempts;

      return prisma.weakTopic.update({
        where: { studentId_topic: { studentId, topic } },
        data: {
          attempts: newAttempts,
          errorRate: newErrorRate,
          lastSeenAt: new Date(),
          quizId,
        },
      });
    }

    return prisma.weakTopic.create({
      data: {
        studentId,
        topic,
        errorRate: isCorrect ? 0 : 1,
        attempts: 1,
        quizId,
      },
    });
  },

  async updateQuizAnalytics(quizId: string) {
    const attempts = await prisma.studentAttempt.findMany({
      where: { quizId, status: "GRADED" },
      select: { score: true, maxScore: true, percentage: true, timeTakenSecs: true },
    });

    if (attempts.length === 0) return;

    const percentages = attempts
      .map((a) => a.percentage ?? 0)
      .filter((p) => p !== null);

    const avgScore = percentages.reduce((s, p) => s + p, 0) / percentages.length;
    const highScore = Math.max(...percentages);
    const lowScore = Math.min(...percentages);
    const passRate =
      (percentages.filter((p) => p >= 60).length / percentages.length) * 100;
    const avgTimeSecs = Math.round(
      attempts
        .map((a) => a.timeTakenSecs ?? 0)
        .reduce((s, t) => s + t, 0) / attempts.length
    );

    await prisma.analytics.upsert({
      where: { quizId },
      create: {
        quizId,
        totalTakers: attempts.length,
        avgScore,
        highScore,
        lowScore,
        passRate,
        avgTimeSecs,
      },
      update: {
        totalTakers: attempts.length,
        avgScore,
        highScore,
        lowScore,
        passRate,
        avgTimeSecs,
      },
    });
  },

  async getAdminStats() {
    const [userCounts, pdfs, quizzes, attempts] = await Promise.all([
      prisma.user.groupBy({
        by: ["role"],
        where: { deletedAt: null },
        _count: { role: true },
      }),
      prisma.pDF.count({ where: { deletedAt: null } }),
      prisma.quiz.count({ where: { deletedAt: null } }),
      prisma.studentAttempt.count(),
    ]);

    const roleMap = userCounts.reduce(
      (acc, r) => {
        acc[r.role] = r._count.role;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalUsers: Object.values(roleMap).reduce((s, v) => s + v, 0),
      totalAdmins: roleMap.ADMIN ?? 0,
      totalEducators: roleMap.EDUCATOR ?? 0,
      totalStudents: roleMap.STUDENT ?? 0,
      totalPDFs: pdfs,
      totalQuizzes: quizzes,
      totalAttempts: attempts,
    };
  },
};
