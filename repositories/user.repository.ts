import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

export const userRepository = {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
  },

  async findMany(params: {
    page: number;
    pageSize: number;
    search?: string;
    role?: Role;
  }) {
    const { page, pageSize, search, role } = params;
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: null,
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          image: true,
          createdAt: true,
          _count: { select: { attempts: true, quizzes: true, pdfs: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  },

  async create(data: {
    id: string;        // Supabase Auth UUID — must match auth.users.id
    name: string;
    email: string;
    password: string;
    role?: Role;
  }) {
    return prisma.user.create({ data });
  },

  async update(
    id: string,
    data: Partial<{ name: string; role: Role; isActive: boolean; image: string }>
  ) {
    return prisma.user.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async countByRole() {
    const counts = await prisma.user.groupBy({
      by: ["role"],
      where: { deletedAt: null },
      _count: { role: true },
    });
    return counts.reduce(
      (acc, c) => {
        acc[c.role] = c._count.role;
        return acc;
      },
      {} as Record<Role, number>
    );
  },
};
