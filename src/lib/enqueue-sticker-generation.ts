import { waitUntil } from "@vercel/functions";
import { isComfyMockEnabled } from "@/lib/comfy-server";
import { logGenerationEvent } from "@/lib/generation-events";
import { enqueueAndKickGptImageJob } from "@/lib/gpt-image-queue";
import { GPT_IMAGE_JOB_KIND } from "@/lib/gpt-image-queue-config";
import { runStickerPreviewGeneration } from "@/lib/sticker-generation";
import { shouldKickPendingStickerPreview } from "@/lib/sticker-generation-policy";
import { prisma } from "@/lib/prisma";

export async function queueStickerGenerationJobs(
  orderId: string,
  options?: { force?: boolean },
) {
  const order = await prisma.stickerOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      borderId: true,
      previewImagePath: true,
      previewStatus: true,
      createdAt: true,
    },
  });

  if (!order) {
    return;
  }
  if (order.previewImagePath || order.previewStatus === "COMPLETED") {
    return;
  }
  if (!options?.force && !shouldKickPendingStickerPreview(order)) {
    return;
  }

  logGenerationEvent({
    kind: "STICKER",
    entityId: orderId,
    orderId,
    step: "sticker.enqueue_batch",
    message: "백그라운드 스티커 생성 시작",
    detail: { borderId: order.borderId },
  });

  if (isComfyMockEnabled()) {
    try {
      const result = await runStickerPreviewGeneration(orderId);
      if (result.error) {
        console.error(
          "[sticker-generation] generate failed",
          orderId,
          result.error,
        );
      }
    } catch (error) {
      console.error("[sticker-generation] generate threw", orderId, error);
    }
    return;
  }

  await prisma.stickerOrder.updateMany({
    where: {
      id: order.id,
      previewImagePath: null,
      previewStatus: { in: ["IDLE", "FAILED"] },
    },
    data: {
      previewStatus: "PROCESSING",
      errorReason: null,
    },
  });

  await enqueueAndKickGptImageJob({
    kind: GPT_IMAGE_JOB_KIND.STICKER,
    targetId: order.id,
    inputImages: order.borderId ? 1 : 2,
    payload: {},
  });
}

/**
 * Enqueue sticker preview in-process (no HTTP self-fetch).
 * GPT itself runs only in the gpt-image worker.
 */
export function enqueueStickerGeneration(orderId: string) {
  waitUntil(
    queueStickerGenerationJobs(orderId).catch((error) => {
      console.error("[sticker-generation] enqueue failed", orderId, error);
    }),
  );
}
