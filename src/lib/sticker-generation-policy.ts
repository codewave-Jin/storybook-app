import { STALE_PROCESSING_MS, isStaleProcessing } from "@/lib/illustration-generation-policy";

export { STALE_PROCESSING_MS };

export function shouldKickPendingStickerPreview(order: {
  previewImagePath: string | null;
  previewStatus: string;
  createdAt: Date;
}) {
  if (order.previewImagePath) {
    return false;
  }
  if (order.previewStatus === "COMPLETED") {
    return false;
  }
  if (order.previewStatus === "FAILED") {
    return false;
  }
  if (order.previewStatus === "IDLE") {
    return true;
  }
  if (order.previewStatus === "PROCESSING") {
    return isStaleProcessing(order.createdAt);
  }
  return false;
}

export function shouldReclaimStickerProcessing(order: {
  previewStatus: string;
  createdAt: Date;
}) {
  return (
    order.previewStatus === "PROCESSING" &&
    isStaleProcessing(order.createdAt)
  );
}
