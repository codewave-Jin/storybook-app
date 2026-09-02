import { waitUntil } from "@vercel/functions";
import { isComfyMockEnabled } from "@/lib/comfy-server";
import { logGenerationEvent } from "@/lib/generation-events";
import {
  enqueueAndKickGptImageJob,
  hasActiveGptImageJob,
} from "@/lib/gpt-image-queue";
import { GPT_IMAGE_JOB_KIND } from "@/lib/gpt-image-queue-config";
import { runIllustrationGeneration } from "@/lib/illustration-generate";
import {
  isStaleProcessing,
  shouldGenerateIllustration,
  staleProcessingBefore,
} from "@/lib/illustration-generation-policy";
import { parseIdList } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

/**
 * Enqueue illustration jobs in-process (no HTTP self-fetch).
 * GPT itself runs only in the gpt-image worker.
 */
export function enqueueIllustrationGenerations(illustrationIds: string[]) {
  if (illustrationIds.length === 0) {
    return Promise.resolve();
  }

  const dispatched = (async () => {
    const pages = await prisma.illustration.findMany({
      where: { id: { in: illustrationIds } },
      select: {
        id: true,
        orderId: true,
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

    const targets = pages.filter((page) => shouldGenerateIllustration(page));
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
        },
      });
    }

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
            chainNext: true,
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

      await enqueueAndKickGptImageJob({
        kind: GPT_IMAGE_JOB_KIND.ILLUSTRATION,
        targetId: page.id,
        inputImages: styledReady ? 1 : 2,
        payload: { chainNext: true, keepImage: false },
      });
    }
  })();

  waitUntil(dispatched);
}

/** Cover (lowest pageNumber) first. One in-flight page at a time. */
export async function enqueueNextPendingIllustration(
  orderId: string,
  options?: { afterPageNumber?: number },
) {
  const pages = await prisma.illustration.findMany({
    where: { orderId },
    orderBy: { pageNumber: "asc" },
    select: {
      id: true,
      pageNumber: true,
      status: true,
      prompt: true,
      updatedAt: true,
    },
  });

  const inFlight = pages.some(
    (page) =>
      page.status === "PROCESSING" && !isStaleProcessing(page.updatedAt),
  );
  if (inFlight) {
    return;
  }

  if (
    await hasActiveGptImageJob(
      GPT_IMAGE_JOB_KIND.ILLUSTRATION,
      pages.map((page) => page.id),
    )
  ) {
    return;
  }

  const afterPageNumber = options?.afterPageNumber ?? 0;
  const next = pages.find((page) => {
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

  if (!next) {
    return;
  }

  enqueueIllustrationGenerations([next.id]);
}
