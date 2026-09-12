"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { enqueueStickerGeneration } from "@/lib/enqueue-sticker-generation";
import { logGenerationEvent } from "@/lib/generation-events";
import { parseCheckoutForm, parseStickerSheetCount, validateCheckoutInput } from "@/lib/checkout";
import { isStickerSizeSelectable } from "@/lib/templates";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import {
  MAX_STICKER_BODY_LENGTH,
  MAX_STICKER_TITLE_LENGTH,
  parseStickerPhrase,
} from "@/lib/sticker-phrase";
import { deleteStickerFile } from "@/lib/uploads";

function stickerCheckoutWrite(formData: FormData) {
  const checkout = parseCheckoutForm(formData);
  const checkoutError = validateCheckoutInput(checkout);
  if (checkoutError) {
    return { error: checkoutError } as const;
  }
  const sheetCount = parseStickerSheetCount(formData);
  return {
    sheetCount,
    data: {
      sheetCount,
      checkoutEmail: checkout.checkoutEmail,
      checkoutPhone: checkout.checkoutPhone,
      shippingName: checkout.shippingName,
      shippingPostalCode: checkout.zonecode,
      shippingAddress: checkout.roadAddress,
      shippingAddressDetail: checkout.detailAddress,
      zonecode: checkout.zonecode,
      roadAddress: checkout.roadAddress,
      detailAddress: checkout.detailAddress,
      sido: checkout.sido,
    },
  } as const;
}

export type CreateStickerOrderState = {
  error?: string;
} | undefined;

export type PayStickerOrderState = {
  error?: string;
  success?: boolean;
} | undefined;

export async function createStickerOrder(
  _prevState: CreateStickerOrderState,
  formData: FormData,
): Promise<CreateStickerOrderState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/sticker/new");
  }

  const userId = session.user.id;
  const characterId = String(formData.get("characterId") ?? "");
  const borderId = String(formData.get("borderId") ?? "").trim();
  const phrase = String(formData.get("phrase") ?? "").trim();
  const sizeOptionId = String(formData.get("sizeOptionId") ?? "");
  const previewImagePath = String(formData.get("previewImagePath") ?? "").trim();
  const checkout = stickerCheckoutWrite(formData);
  if ("error" in checkout) {
    return { error: checkout.error };
  }
  const { sheetCount, data: checkoutData } = checkout;
  const parts = parseStickerPhrase(phrase);

  if (!characterId) {
    return { error: "캐릭터를 선택해 주세요." };
  }
  if (!borderId) {
    return { error: "테두리를 선택해 주세요." };
  }
  if (!parts.title && !parts.body) {
    return { error: "문구를 입력해 주세요." };
  }
  if (parts.title.length > MAX_STICKER_TITLE_LENGTH) {
    return { error: `제목은 ${MAX_STICKER_TITLE_LENGTH}자 이하로 입력해 주세요.` };
  }
  if (parts.body.length > MAX_STICKER_BODY_LENGTH) {
    return { error: `문구는 ${MAX_STICKER_BODY_LENGTH}자 이하로 입력해 주세요.` };
  }
  if (!sizeOptionId) {
    return { error: "사이즈를 선택해 주세요." };
  }

  const [character, border, sizeOption] = await Promise.all([
    prisma.character.findFirst({
      where: { id: characterId, userId },
    }),
    prisma.stickerBorder.findFirst({
      where: { id: borderId, isActive: true },
    }),
    prisma.stickerSizeOption.findUnique({ where: { id: sizeOptionId } }),
  ]);

  if (!character) {
    return { error: "선택한 캐릭터를 확인할 수 없습니다." };
  }
  if (character.status !== "COMPLETED") {
    return { error: "생성이 완료된 캐릭터만 선택할 수 있습니다." };
  }
  if (!border) {
    return { error: "선택한 테두리를 확인할 수 없습니다." };
  }
  if (!sizeOption) {
    return { error: "선택한 사이즈를 찾을 수 없습니다." };
  }
  if (!isStickerSizeSelectable(sizeOption.label)) {
    return { error: "아직 준비 중인 사이즈입니다." };
  }

  const readyPreview =
    previewImagePath.startsWith("/uploads/stickers/") ||
    /^https?:\/\//i.test(previewImagePath);
  const order = await prisma.stickerOrder.create({
    data: {
      userId,
      characterId: character.id,
      templateId: null,
      borderId: border.id,
      costumeId: null,
      customCostumeHint: "",
      phrase,
      sizeOptionId: sizeOption.id,
      quantity: sizeOption.quantityPerA4 * sheetCount,
      paymentStatus: "PAID",
      ...checkoutData,
      productionStatus: "WAITING",
      previewStatus: readyPreview ? "COMPLETED" : "IDLE",
      previewImagePath: readyPreview ? previewImagePath : null,
      compositeImagePath: readyPreview ? previewImagePath : null,
    },
  });

  if (!readyPreview) {
    enqueueStickerGeneration(order.id);
  }
  logGenerationEvent({
    kind: "STICKER",
    entityId: order.id,
    orderId: order.id,
    userId,
    step: "sticker.order_created",
    message: "스티커 주문 생성 및 생성 트리거",
    detail: { readyPreview, sheetCount },
  });

  redirect(`/dashboard/sticker/${order.id}/preview`);
}

export async function payForStickerOrder(
  _prevState: PayStickerOrderState,
  formData: FormData,
): Promise<PayStickerOrderState> {
  if (!PAYMENTS_ENABLED) {
    return { error: "결제는 아직 준비 중이에요." };
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) {
    return { error: "주문을 찾을 수 없습니다." };
  }

  const order = await prisma.stickerOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: {
      id: true,
      paymentStatus: true,
      sizeOption: { select: { quantityPerA4: true } },
    },
  });

  if (!order) {
    return { error: "주문을 찾을 수 없습니다." };
  }

  if (order.paymentStatus === "PAID") {
    revalidatePath(`/dashboard/sticker/${orderId}/preview`);
    return { success: true };
  }

  const checkout = stickerCheckoutWrite(formData);
  if ("error" in checkout) {
    return { error: checkout.error };
  }

  await prisma.stickerOrder.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      quantity: order.sizeOption.quantityPerA4 * checkout.sheetCount,
      ...checkout.data,
    },
  });

  revalidatePath(`/dashboard/sticker/${orderId}/preview`);
  revalidatePath("/dashboard");
  revalidatePath("/mypage");
  return { success: true };
}

export async function deleteDraftStickerOrder(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const order = await prisma.stickerOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: {
      id: true,
      paymentStatus: true,
      previewImagePath: true,
      finalImagePath: true,
      compositeImagePath: true,
    },
  });

  if (!order) {
    return { error: "주문을 찾을 수 없습니다." };
  }

  if (order.paymentStatus === "PAID") {
    return { error: "결제가 끝난 주문은 삭제할 수 없습니다." };
  }

  await deleteStickerFile(order.previewImagePath);
  await deleteStickerFile(order.finalImagePath);
  await deleteStickerFile(order.compositeImagePath);

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { stickerOrderId: orderId } }),
    prisma.stickerOrder.delete({ where: { id: orderId } }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/mypage");
  revalidatePath(`/dashboard/sticker/${orderId}/preview`);
  return { success: true };
}
