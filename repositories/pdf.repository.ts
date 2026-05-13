import { prisma } from "@/lib/db";
import type { PDFStatus } from "@prisma/client";

export const pdfRepository = {
  async findById(id: string) {
    return prisma.pDF.findUnique({
      where: { id, deletedAt: null },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { chunks: true } },
      },
    });
  },

  async findMany(params: {
    page: number;
    pageSize: number;
    uploadedById?: string;
    status?: PDFStatus;
    search?: string;
  }) {
    const { page, pageSize, uploadedById, status, search } = params;
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: null,
      ...(uploadedById && { uploadedById }),
      ...(status && { status }),
      ...(search && {
        title: { contains: search, mode: "insensitive" as const },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.pDF.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
          _count: { select: { chunks: true } },
        },
      }),
      prisma.pDF.count({ where }),
    ]);

    return { data, total };
  },

  async create(data: {
    title: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    uploadedById: string;
  }) {
    return prisma.pDF.create({ data });
  },

  async updateStatus(id: string, status: PDFStatus, errorMessage?: string) {
    return prisma.pDF.update({
      where: { id },
      data: { status, ...(errorMessage && { errorMessage }) },
    });
  },

  async softDelete(id: string) {
    return prisma.pDF.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async getChunks(pdfId: string) {
    return prisma.extractedChunk.findMany({
      where: { pdfId },
      orderBy: { chunkIndex: "asc" },
    });
  },
};
