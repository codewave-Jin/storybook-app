import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logGenerationEvent } from "@/lib/generation-events";
import { isStickerSizeSelectable } from "@/lib/templates";
import { attachTokenHoldToOrder, refundTokenHoldsForOrder } from "@/lib/tokens";
import { isAllowedStickerAssetPath } from "@/lib/sticker-layout-constants";
import { deleteStickerFile } from "@/lib/uploads";

async function defaultStickerDraftOptions() {
  const [border, sizes] = await Promise.all([
    prisma.stickerBorder.findFirst({
      where: { isActive: true, key: "none" },
      select: { id: true },
    }),
    prisma.stickerSizeOption.findMany({
      orderBy: { widthMm: "asc" },
      select: { id: true, label: true, quantityPerA4: true },
    }),
  ]);
  const size = sizes.find((item) => isStickerSizeSelectable(item.label));
  if (!border) {
    return { ok: false as const, error: "기본 테두리를 찾을 수 없습니다." };
  }
  if (!size) {
    return { ok: false as const, error: "기본 사이즈를 찾을 수 없습니다." };
  }
  return { ok: true as const, border, size };
}

export async function createInProgressStickerDraft(input: {
  userId: string;
  characterId: string;
  phrase: string;
  customCostumeHint: string;
  holdId: string;
}): Promise<{ orderId: string } | { error: string }> {
  const defaults = await defaultStickerDraftOptions();
  if (!defaults.ok) {
    return { error: defaults.error };
  }

  const order = await prisma.stickerOrder.create({
    data: {
      userId: input.userId,
      characterId: input.characterId,
      templateId: null,
      borderId: defaults.border.id,
      costumeId: null,
      customCostumeHint: input.customCostumeHint,
      phrase: input.phrase,
      sizeOptionId: defaults.size.id,
      quantity: defaults.size.quantityPerA4,
      paymentStatus: "PENDING",
      productionStatus: "WAITING",
      previewStatus: "PROCESSING",
      previewImagePath: null,
      compositeImagePath: null,
    },
    select: { id: true },
  });

  await attachTokenHoldToOrder(input.userId, input.holdId, order.id);
  logGenerationEvent({
    kind: "STICKER",
    entityId: order.id,
    orderId: order.id,
    userId: input.userId,
    step: "sticker.special_draft_created",
    message: "특수 제작 토큰 사용, 제작중 초안 저장",
  });
  revalidatePath("/dashboard");
  revalidatePath("/mypage");
  return { orderId: order.id };
}

export async function completeStickerDraftPreview(
  orderId: string,
  imagePath: string,
) {
  await prisma.stickerOrder.update({
    where: { id: orderId },
    data: {
      previewStatus: "COMPLETED",
      previewImagePath: imagePath,
      compositeImagePath: imagePath,
      errorReason: null,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/sticker/${orderId}/preview`);
}

export async function deleteUnpaidStickerDraft(userId: string, orderId: string) {
  const order = await prisma.stickerOrder.findFirst({
    where: { id: orderId, userId, paymentStatus: "PENDING" },
    select: {
      id: true,
      previewImagePath: true,
      finalImagePath: true,
      compositeImagePath: true,
    },
  });
  if (!order) {
    return;
  }

  await refundTokenHoldsForOrder(userId, "STICKER_SPECIAL", order.id);
  await deleteStickerFile(order.previewImagePath);
  await deleteStickerFile(order.finalImagePath);
  await deleteStickerFile(order.compositeImagePath);
  await prisma.$transaction([
    prisma.review.deleteMany({ where: { stickerOrderId: order.id } }),
    prisma.stickerOrder.delete({ where: { id: order.id } }),
  ]);
  revalidatePath("/dashboard");
  revalidatePath("/mypage");
}

export function readyStickerPreviewPath(value: string) {
  return (
    value.startsWith("/uploads/stickers/") ||
    /^https?:\/\//i.test(value) ||
    isAllowedStickerAssetPath(value)
  );
}
