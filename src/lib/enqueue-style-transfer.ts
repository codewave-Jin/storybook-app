import { waitUntil } from "@vercel/functions";
import { isComfyMockEnabled } from "@/lib/comfy-server";
import { enqueueAndKickGptImageJob } from "@/lib/gpt-image-queue";
import { GPT_IMAGE_JOB_KIND } from "@/lib/gpt-image-queue-config";

export function enqueueOrderStyleTransfer(
  orderId: string,
  pageNumbers: number[],
) {
  const dispatched = (async () => {
    if (pageNumbers.length === 0) {
      return;
    }

    if (isComfyMockEnabled()) {
      const { finishStyleTransferAndStartIllustrations } = await import(
        "@/lib/storybook-generation"
      );
      await finishStyleTransferAndStartIllustrations({
        orderId,
        pageNumbers,
        wait: false,
      });
      return;
    }

    await enqueueAndKickGptImageJob({
      kind: GPT_IMAGE_JOB_KIND.STYLE_CHARACTER,
      targetId: orderId,
      inputImages: 2,
      payload: { pageNumbers },
    });
  })().catch((error) => {
    console.error(
      "[storybook-generation] style-character enqueue failed",
      orderId,
      error,
    );
  });

  waitUntil(dispatched);
  return dispatched;
}
