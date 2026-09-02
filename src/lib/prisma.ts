import { PrismaClient } from "@prisma/client";

const PRISMA_CLIENT_GENERATION = 4;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaGeneration: number | undefined;
};

function getPrismaClient() {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaGeneration === PRISMA_CLIENT_GENERATION
  ) {
    return globalForPrisma.prisma;
  }

  void globalForPrisma.prisma?.$disconnect();
  const client = new PrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaGeneration = PRISMA_CLIENT_GENERATION;
  }
  return client;
}

export const prisma = getPrismaClient();

