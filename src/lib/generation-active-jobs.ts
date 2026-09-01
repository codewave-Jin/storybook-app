import { prisma } from "@/lib/prisma";

export type ActiveGenerationJob = {
  kind: "ILLUSTRATION" | "STICKER" | "CHARACTER";
  entityId: string;
  orderId: string | null;
  label: string;
  startedAt: string;
};

export async function loadActiveGenerationJobs(): Promise<ActiveGenerationJob[]> {
  const [illustrations, stickers, characters] = await Promise.all([
    prisma.illustration.findMany({
      where: { status: "PROCESSING" },
      select: {
        id: true,
        orderId: true,
        pageNumber: true,
        pageType: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "asc" },
      take: 20,
    }),
    prisma.stickerOrder.findMany({
      where: { previewStatus: "PROCESSING" },
      select: { id: true, phrase: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
    prisma.character.findMany({
      where: { status: "PROCESSING" },
      select: { id: true, label: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
      take: 20,
    }),
  ]);

  const jobs: ActiveGenerationJob[] = [];

  for (const row of illustrations) {
    jobs.push({
      kind: "ILLUSTRATION",
      entityId: row.id,
      orderId: row.orderId,
      label: `동화 ${row.pageType === "COVER" ? "표지" : "본문"} p${row.pageNumber}`,
      startedAt: row.updatedAt.toISOString(),
    });
  }

  for (const row of stickers) {
    jobs.push({
      kind: "STICKER",
      entityId: row.id,
      orderId: row.id,
      label: `스티커 · ${row.phrase.slice(0, 24)}`,
      startedAt: row.createdAt.toISOString(),
    });
  }

  for (const row of characters) {
    jobs.push({
      kind: "CHARACTER",
      entityId: row.id,
      orderId: null,
      label: `캐릭터 · ${row.label}`,
      startedAt: row.updatedAt.toISOString(),
    });
  }

  return jobs;
}
