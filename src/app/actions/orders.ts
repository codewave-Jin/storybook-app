"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  startOrderPaidGeneration,
  startOrderPreviewGeneration,
} from "@/lib/preview-generation";
import { logGenerationEvent } from "@/lib/generation-events";
import { defaultExpectedDeliveryAt } from "@/lib/fulfillment";
import { parseCheckoutForm, validateCheckoutInput } from "@/lib/checkout";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import { ensureOrderPhotoAlbumPages } from "@/lib/photo-album-pages";
import { resolveOrderArtStyleId } from "@/lib/art-styles";
import { prisma } from "@/lib/prisma";
import {
  MAX_SUPPORTING_CAST,
  isHeroAgeRangeKey,
  isStorybookTemplateSelectable,
  parseCastRoles,
  parseCustomFields,
} from "@/lib/templates";
import { validateCustomInputValues } from "@/lib/custom-input-guard";
import { deleteIllustrationFile } from "@/lib/uploads";
import {
  buildPreviewBookPages,
  previewIllustrationWhere,
} from "@/lib/preview-pages";

export type CreateOrderState = {
  error?: string;
} | undefined;

export type PayOrderState = {
  error?: string;
  success?: boolean;
} | undefined;

export async function createOrder(
  _prevState: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const templateId = String(formData.get("templateId") ?? "");
  const heroCharacterId = String(
    formData.get("heroCharacterId") || formData.get("characterIds") || "",
  ).trim();
  const heroAgeRange = String(formData.get("heroAgeRange") ?? "").trim();
  const castCharacterIds = formData
    .getAll("castCharacterIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const castRelationKeys = formData
    .getAll("castRelationKeys")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!templateId) {
    return { error: "동화책 유형을 선택해 주세요." };
  }

  if (!heroCharacterId) {
    return { error: "주인공 캐릭터를 선택해 주세요." };
  }

  if (!isHeroAgeRangeKey(heroAgeRange)) {
    return { error: "주인공 나이를 선택해 주세요." };
  }

  if (castCharacterIds.length !== castRelationKeys.length) {
    return { error: "등장인물 정보를 다시 확인해 주세요." };
  }

  if (castCharacterIds.length > MAX_SUPPORTING_CAST) {
    return { error: "등장인물은 한 명만 추가할 수 있습니다." };
  }

  const template = await prisma.storybookTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return { error: "선택한 동화책을 찾을 수 없습니다." };
  }

  if (!isStorybookTemplateSelectable(template.title)) {
    return { error: "아직 준비 중인 동화책입니다." };
  }

  const castRoles = parseCastRoles(template.castRoles, template.title);
  const allowedRelationKeys = new Set(castRoles.map((role) => role.key));
  const supportingCast: Array<{ characterId: string; relationKey: string }> = [];
  const usedCastIds = new Set<string>([heroCharacterId]);

  for (let index = 0; index < castCharacterIds.length; index += 1) {
    const characterId = castCharacterIds[index];
    const relationKey = castRelationKeys[index];
    if (usedCastIds.has(characterId)) {
      return { error: "같은 캐릭터는 한 번만 등장할 수 있습니다." };
    }
    if (!allowedRelationKeys.has(relationKey)) {
      return { error: "이 동화책에서 쓸 수 없는 관계입니다." };
    }
    usedCastIds.add(characterId);
    supportingCast.push({ characterId, relationKey });
  }

  const characterIds = [heroCharacterId, ...castCharacterIds];

  const characters = await prisma.character.findMany({
    where: {
      id: { in: characterIds },
      userId,
    },
  });

  if (characters.length !== characterIds.length) {
    return { error: "선택한 캐릭터를 확인할 수 없습니다." };
  }

  if (characters.some((character) => character.status !== "COMPLETED")) {
    return { error: "생성이 완료된 캐릭터만 선택할 수 있습니다." };
  }

  const customFields = parseCustomFields(template.customFields);
  const rawCustomValues: Record<string, string> = {};
  for (const field of customFields) {
    rawCustomValues[field.key] = String(
      formData.get(`custom:${field.key}`) ?? "",
    );
  }

  const validated = validateCustomInputValues(customFields, rawCustomValues);
  if ("error" in validated) {
    return { error: validated.error };
  }
  const customInputValues = validated.values;

  const submittedArtStyleId = String(formData.get("artStyleId") ?? "").trim();
  const resolvedStyle = await resolveOrderArtStyleId({
    templateId: template.id,
    submittedArtStyleId,
  });
  if (resolvedStyle.error) {
    return { error: resolvedStyle.error };
  }

  const order = await prisma.storybookOrder.create({
    data: {
      userId,
      templateId: template.id,
      selectedCharacterIds: characterIds,
      customInputValues,
      heroAgeRange,
      supportingCast,
      artStyleId: resolvedStyle.artStyleId,
      paymentStatus: "PENDING",
      productionStatus: "WAITING",
    },
  });

  try {
    logGenerationEvent({
      kind: "STORYBOOK_ORDER",
      entityId: order.id,
      orderId: order.id,
      userId,
      step: "storybook.order_created",
      message: "동화책 주문 생성 및 미리보기 트리거",
      detail: {
        templateId: template.id,
        characterIds,
        heroAgeRange,
        supportingCast,
        artStyleId: resolvedStyle.artStyleId,
      },
    });
    await startOrderPreviewGeneration(order.id);
  } catch (error) {
    console.error("preview generation failed to start", error);
  }

  redirect(`/dashboard/orders/${order.id}/preview`);
}

export async function payForOrder(
  _prevState: PayOrderState,
  formData: FormData,
): Promise<PayOrderState> {
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

  const order = await prisma.storybookOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: { id: true, paymentStatus: true, expectedDeliveryAt: true },
  });

  if (!order) {
    return { error: "주문을 찾을 수 없습니다." };
  }

  if (order.paymentStatus === "PAID") {
    try {
      await startOrderPaidGeneration(orderId);
    } catch (error) {
      console.error("paid generation failed to start", error);
    }
    revalidatePath(`/dashboard/orders/${orderId}/preview`);
    return { success: true };
  }

  const previewPages = await prisma.illustration.findMany({
    where: { orderId, ...previewIllustrationWhere },
    select: {
      id: true,
      status: true,
      pageType: true,
      pageNumber: true,
      isAutoGenerated: true,
      imagePath: true,
    },
  });
  const preview = buildPreviewBookPages(previewPages);
  if (
    preview.some(
      (page) => !page.id || page.status !== "COMPLETED" || !page.imagePath,
    )
  ) {
    return { error: "미리보기가 끝난 뒤에 결제할 수 있습니다." };
  }

  const checkout = parseCheckoutForm(formData);
  const checkoutError = validateCheckoutInput(checkout);
  if (checkoutError) {
    return { error: checkoutError };
  }

  try {
    await prisma.storybookOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        expectedDeliveryAt:
          order.expectedDeliveryAt ?? defaultExpectedDeliveryAt(new Date()),
        checkoutEmail: checkout.checkoutEmail,
        checkoutPhone: checkout.checkoutPhone,
        shippingName: checkout.shippingName,
        shippingPostalCode: checkout.zonecode,
        shippingAddress: checkout.roadAddress,
        shippingAddressDetail: checkout.detailAddress,
        includePhotoAlbum: checkout.includePhotoAlbum,
      },
    });
  } catch (error) {
    console.error("payForOrder update failed", error);
    return { error: "결제 정보를 저장하지 못했습니다. 다시 시도해 주세요." };
  }

  try {
    await prisma.$executeRaw`
      UPDATE "StorybookOrder"
      SET
        "zonecode" = ${checkout.zonecode},
        "roadAddress" = ${checkout.roadAddress},
        "detailAddress" = ${checkout.detailAddress},
        "sido" = ${checkout.sido},
        "quantity" = ${checkout.quantity}
      WHERE id = ${orderId}
    `;
  } catch (error) {
    console.error("payForOrder extra fields failed", error);
    try {
      await prisma.$executeRaw`
        UPDATE "StorybookOrder"
        SET "quantity" = ${checkout.quantity}
        WHERE id = ${orderId}
      `;
    } catch (quantityError) {
      console.error("payForOrder quantity failed", quantityError);
    }
  }

  if (checkout.includePhotoAlbum) {
    try {
      await ensureOrderPhotoAlbumPages(orderId);
    } catch (error) {
      console.error("photo album pages failed", error);
    }
  }

  try {
    await startOrderPaidGeneration(orderId);
  } catch (error) {
    console.error("paid generation failed to start", error);
  }

  revalidatePath(`/dashboard/orders/${orderId}/preview`);
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteDraftOrder(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const order = await prisma.storybookOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: {
      illustrations: {
        select: {
          imagePath: true,
          sceneImagePath: true,
          upscaledImagePath: true,
        },
      },
    },
  });

  if (!order) {
    return { error: "주문을 찾을 수 없습니다." };
  }

  if (order.paymentStatus === "PAID") {
    return { error: "결제가 끝난 주문은 삭제할 수 없습니다." };
  }

  for (const illustration of order.illustrations) {
    await deleteIllustrationFile(illustration.imagePath);
    await deleteIllustrationFile(illustration.sceneImagePath);
    await deleteIllustrationFile(illustration.upscaledImagePath);
  }

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { storybookOrderId: orderId } }),
    prisma.illustration.deleteMany({ where: { orderId } }),
    prisma.photoAlbumPage.deleteMany({ where: { orderId } }),
    prisma.storybookOrder.delete({ where: { id: orderId } }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/mypage");
  revalidatePath(`/dashboard/orders/${orderId}/preview`);
  return { success: true };
}
