"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
  const templateId = String(formData.get("templateId") ?? "");
  const phrase = String(formData.get("phrase") ?? "").trim();
  const sizeOptionId = String(formData.get("sizeOptionId") ?? "");

  if (!characterId) {
    return { error: "캐릭터를 선택해 주세요." };
  }
  if (!templateId) {
    return { error: "템플릿을 선택해 주세요." };
  }
  if (!phrase) {
    return { error: "문구를 선택하거나 입력해 주세요." };
  }
  if (phrase.length > 16) {
    return { error: "문구는 16자 이하로 입력해 주세요." };
  }
  if (!sizeOptionId) {
    return { error: "사이즈를 선택해 주세요." };
  }

  const [character, template, sizeOption] = await Promise.all([
    prisma.character.findFirst({
      where: { id: characterId, userId },
    }),
    prisma.stickerTemplate.findUnique({ where: { id: templateId } }),
    prisma.stickerSizeOption.findUnique({ where: { id: sizeOptionId } }),
  ]);

  if (!character) {
    return { error: "선택한 캐릭터를 확인할 수 없습니다." };
  }
  if (character.status !== "COMPLETED") {
    return { error: "생성이 완료된 캐릭터만 선택할 수 있습니다." };
  }
  if (!template) {
    return { error: "선택한 템플릿을 찾을 수 없습니다." };
  }
  if (!sizeOption) {
    return { error: "선택한 사이즈를 찾을 수 없습니다." };
  }

  const order = await prisma.stickerOrder.create({
    data: {
      userId,
      characterId: character.id,
      templateId: template.id,
      phrase,
      sizeOptionId: sizeOption.id,
      quantity: sizeOption.quantityPerA4,
      paymentStatus: "PENDING",
      productionStatus: "WAITING",
    },
  });

  redirect(`/dashboard/sticker/${order.id}/preview`);
}

export async function payForStickerOrder(
  _prevState: PayStickerOrderState,
  formData: FormData,
): Promise<PayStickerOrderState> {
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
    select: { id: true, paymentStatus: true },
  });

  if (!order) {
    return { error: "주문을 찾을 수 없습니다." };
  }

  if (order.paymentStatus === "PAID") {
    revalidatePath(`/dashboard/sticker/${orderId}/preview`);
    return { success: true };
  }

  await prisma.stickerOrder.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID" },
  });

  revalidatePath(`/dashboard/sticker/${orderId}/preview`);
  revalidatePath("/dashboard");
  return { success: true };
}
