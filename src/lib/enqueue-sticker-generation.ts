import { waitUntil } from "@vercel/functions";
import { runStickerPreviewGeneration } from "@/lib/sticker-generation";
import { shouldKickPendingStickerPreview } from "@/lib/sticker-generation-policy";
import { prisma } from "@/lib/prisma";

/**
 * Kick sticker preview generation in-process via waitUntil.
 * Avoids fragile HTTP self-fetch (base URL / INTERNAL_API_KEY / 308 redirect),
 * which left orders stuck in IDLE forever when the enqueue request failed.
 */
export function enqueueStickerGeneration(orderId: string) {
  const dispatched = (async () => {
    const order = await prisma.stickerOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        previewImagePath: true,
        previewStatus: true,
        createdAt: true,
      },
    });

    if (!order || !shouldKickPendingStickerPreview(order)) {
      return;
    }

    console.log("[sticker-generation] direct generate start", orderId);

    try {
      const result = await runStickerPreviewGeneration(orderId);
      if (result.error) {
        console.error("[sticker-generation] generate failed", orderId, result.error);
      } else {
        console.log("[sticker-generation] generate ok", orderId, result);
      }
    } catch (error) {
      console.error("[sticker-generation] generate threw", orderId, error);
    }
  })();

  waitUntil(dispatched);
  return dispatched;
}
