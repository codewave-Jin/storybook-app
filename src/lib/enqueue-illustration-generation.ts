import { waitUntil } from "@vercel/functions";
import { isComfyMockEnabled } from "@/lib/comfy-server";
import { logGenerationEvent } from "@/lib/generation-events";
import {
  activeGptImageTargetIds,
  enqueueGptImageJob,
  kickGptImageWorkers,
} from "@/lib/gpt-image-queue";
import {
  GPT_IMAGE_JOB_KIND,
  gptImageIllustrationPriority,
} from "@/lib/gpt-image-queue-config";
import { runIllustrationGeneration } from "@/lib/illustration-generate";
import {
  isStaleProcessing,
  shouldGenerateIllustration,
  staleProcessingBefore,
} from "@/lib/illustration-generation-policy";
import { parseIdList } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export type EnqueuePendingIllustrationOptions = {
  pageNumbers?: number[];
  afterPageNumber?: number;
  limit?: number;
  chainNext?: boolean;
};

/**
 * Enqueue illustration jobs in-process (no HTTP self-fetch).
 * GPT itself runs only in the gpt-image worker.
 */
export function enqueueIllustrationGenerations(
  illustrationIds: string[],
  options?: { chainNext?: boolean },
) {
  if (illustrationIds.length === 0) {
    return Promise.resolve();
  }

  const chainNext = options?.chainNext === true;

  const dispatched = (async () => {
    const pages = await prisma.illustration.findMany({
      where: { id: { in: illustrationIds } },
      select: {
        id: true,
        orderId: true,
        pageNumber: true,
        pageType: true,
        prompt: true,
        selectedCharacterIds: true,
        status: true,
        updatedAt: true,
        order: {
          select: {
            userId: true,
            characterAsset: {
              select: { status: true, styledImageUrl: true },
            },
          },
        },
      },
    });

    const targets = pages
      .filter((page) => shouldGenerateIllustration(page))
      .sort((a, b) => a.pageNumber - b.pageNumber);
    const first = pages[0];
    if (first) {
      logGenerationEvent({
        kind: "STORYBOOK_ORDER",
        entityId: first.orderId,
        orderId: first.orderId,
        userId: first.order.userId,
        step: "illustration.enqueue_batch",
        message: "백그라운드 삽화 생성 시작",
        detail: {
          illustrationIds: targets.map((page) => page.id),
          count: targets.length,
          chainNext,
        },
      });
    }

    let created = 0;
    for (const page of targets) {
      const characterIds = parseIdList(page.selectedCharacterIds);
      if (!page.prompt.trim() || characterIds.length < 1) {
        console.error(
          "[storybook-generation] skip generate (missing prompt/characters)",
          page.id,
        );
        continue;
      }

      if (isComfyMockEnabled()) {
        try {
          await runIllustrationGeneration({
            illustrationId: page.id,
            prompt: page.prompt,
            characterIds,
            chainNext,
          });
        } catch (error) {
          console.error(
            "[storybook-generation] mock generate threw",
            page.id,
            error,
          );
        }
        continue;
      }

      await prisma.illustration.updateMany({
        where: {
          id: page.id,
          OR: [
            { status: { in: ["IDLE", "FAILED"] } },
            { status: "PROCESSING", updatedAt: { lt: staleProcessingBefore() } },
          ],
        },
        data: {
          status: "PROCESSING",
          progressPercent: 8,
          progressLabel: "대기 중",
          errorReason: null,
        },
      });

      const styledReady =
        page.order.characterAsset?.status === "READY" &&
        Boolean(page.order.characterAsset.styledImageUrl);

      const result = await enqueueGptImageJob({
        kind: GPT_IMAGE_JOB_KIND.ILLUSTRATION,
        targetId: page.id,
        inputImages: styledReady ? 1 : 2,
        priority: gptImageIllustrationPriority(page.pageNumber, page.pageType),
        payload: { chainNext, keepImage: false },
      });
      if (result.created) {
        created += 1;
      }
    }

    if (!isComfyMockEnabled()) {
      kickGptImageWorkers(Math.max(created, targets.length));
    }
  })();

  waitUntil(dispatched);
  return dispatched;
}

/** Pending pages for an order. No in-flight-one-page gate. */
export async function enqueuePendingIllustrations(
  orderId: string,
  options?: EnqueuePendingIllustrationOptions,
) {
  const pages = await prisma.illustration.findMany({
    where: {
      orderId,
      ...(options?.pageNumbers
        ? { pageNumber: { in: options.pageNumbers } }
        : {}),
    },
    orderBy: { pageNumber: "asc" },
    select: {
      id: true,
      pageNumber: true,
      status: true,
      prompt: true,
      updatedAt: true,
    },
  });

  const afterPageNumber = options?.afterPageNumber ?? 0;
  const candidates = pages.filter((page) => {
    if (page.pageNumber <= afterPageNumber) {
      return false;
    }
    if (!page.prompt.trim()) {
      return false;
    }
    if (page.status === "IDLE") {
      return true;
    }
    return page.status === "PROCESSING" && isStaleProcessing(page.updatedAt);
  });

  if (candidates.length === 0) {
    return;
  }

  const activeIds = await activeGptImageTargetIds(
    GPT_IMAGE_JOB_KIND.ILLUSTRATION,
    candidates.map((page) => page.id),
  );
  const pending = candidates.filter((page) => !activeIds.has(page.id));
  const limit = options?.limit ?? pending.length;
  const batch = pending.slice(0, Math.max(0, limit));
  if (batch.length === 0) {
    return;
  }

  await enqueueIllustrationGenerations(
    batch.map((page) => page.id),
    { chainNext: options?.chainNext === true },
  );
}
