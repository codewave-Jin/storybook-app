import { Prisma, PrismaClient } from "@prisma/client";

const PRISMA_CLIENT_GENERATION = 7;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaGeneration: number | undefined;
};

function withPrismaPoolParams(url: string) {
  const params: string[] = [];
  if (!/[?&]connection_limit=/.test(url)) {
    const limit = process.env.VERCEL
      ? "1"
      : (process.env.PRISMA_CONNECTION_LIMIT ?? "5");
    params.push(`connection_limit=${limit}`);
  }
  if (!/[?&]pool_timeout=/.test(url)) {
    params.push("pool_timeout=20");
  }
  if (params.length === 0) {
    return url;
  }
  return `${url}${url.includes("?") ? "&" : "?"}${params.join("&")}`;
}

export function isPrismaPoolTimeout(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2024"
  ) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("P2024") ||
    message.includes("ECHECKOUTTIMEOUT") ||
    message.includes("Timed out fetching a new connection") ||
    message.includes("unable to check out connection")
  );
}

export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isPrismaPoolTimeout(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
    }
  }
  throw lastError;
}

function getPrismaClient() {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaGeneration === PRISMA_CLIENT_GENERATION
  ) {
    return globalForPrisma.prisma;
  }

  void globalForPrisma.prisma?.$disconnect();
  const datasourceUrl = process.env.DATABASE_URL
    ? withPrismaPoolParams(process.env.DATABASE_URL)
    : undefined;
  const client = datasourceUrl
    ? new PrismaClient({ datasourceUrl })
    : new PrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaGeneration = PRISMA_CLIENT_GENERATION;
  return client;
}

export const prisma = getPrismaClient();
