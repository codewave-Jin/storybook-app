"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { enqueueStickerGeneration } from "@/lib/enqueue-sticker-generation";
import { isStickerTemplateSelectable, isStickerSizeSelectable } from "@/lib/templates";
import { prisma } from "@/lib/prisma";
import { deleteStickerFile } from "@/lib/uploads";

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
  const costumeId = String(formData.get("costumeId") ?? "").trim();
  const customCostumeHint = String(formData.get("customCostumeHint") ?? "").trim();
  const phrase = String(formData.get("phrase") ?? "").trim();
  const sizeOptionId = String(formData.get("sizeOptionId") ?? "");

  if (!characterId) {
    return { error: "캐릭터를 선택해 주세요." };
  }
  if (!templateId) {
    return { error: "용도를 선택해 주세요." };
  }
  if (!costumeId && !customCostumeHint) {
    return { error: "옷을 선택하거나 입력해 주세요." };
  }
  if (customCostumeHint.length > 20) {
    return { error: "코스튬은 20자 이하로 입력해 주세요." };
  }
  if (!phrase) {
    return { error: "문구를 선택하거나 입력해 주세요." };
  }
  if (phrase.length > 25) {
    return { error: "문구는 25자 이하로 입력해 주세요." };
  }
  if (!sizeOptionId) {
    return { error: "사이즈를 선택해 주세요." };
  }

  const [character, template, costumeLink, sizeOption] = await Promise.all([
    prisma.character.findFirst({
      where: { id: characterId, userId },
    }),
    prisma.stickerTemplate.findUnique({ where: { id: templateId } }),
    costumeId
      ? prisma.templateCostume.findUnique({
          where: {
            stickerTemplateId_costumeId: {
              stickerTemplateId: templateId,
              costumeId,
            },
          },
          include: { costume: true },
        })
      : Promise.resolve(null),
    prisma.stickerSizeOption.findUnique({ where: { id: sizeOptionId } }),
  ]);

  if (!character) {
    return { error: "선택한 캐릭터를 확인할 수 없습니다." };
  }
  if (character.status !== "COMPLETED") {
    return { error: "생성이 완료된 캐릭터만 선택할 수 있습니다." };
  }
  if (!template) {
    return { error: "선택한 용도를 찾을 수 없습니다." };
  }
  if (!isStickerTemplateSelectable(template.key)) {
    return { error: "아직 준비 중인 스티커입니다." };
  }
  if (!customCostumeHint && !costumeLink?.costume.isActive) {
    return { error: "선택한 옷을 확인할 수 없습니다." };
  }
  if (!sizeOption) {
    return { error: "선택한 사이즈를 찾을 수 없습니다." };
  }
  if (!isStickerSizeSelectable(sizeOption.label)) {
    return { error: "아직 준비 중인 사이즈입니다." };
  }

  const order = await prisma.stickerOrder.create({
    data: {
      userId,
      characterId: character.id,
      templateId: template.id,
      costumeId: customCostumeHint ? null : costumeLink?.costume.id,
      customCostumeHint,
      phrase,
      sizeOptionId: sizeOption.id,
      quantity: sizeOption.quantityPerA4,
      paymentStatus: "PENDING",
      productionStatus: "WAITING",
      previewStatus: "IDLE",
    },
  });

  await enqueueStickerGeneration(order.id);

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

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { stickerOrderId: orderId } }),
    prisma.stickerOrder.delete({ where: { id: orderId } }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/mypage");
  revalidatePath(`/dashboard/sticker/${orderId}/preview`);
  return { success: true };
}
