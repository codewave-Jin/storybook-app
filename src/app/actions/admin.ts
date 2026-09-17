"use server";

import { revalidatePath } from "next/cache";
import type {
  FulfillmentStatus,
  PaymentStatus,
  ProductionStatus,
  StickerPreviewStatus,
} from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import {
  canTransitionFulfillment,
  isFulfillmentStatus,
} from "@/lib/fulfillment";
import { loadOrderPrintComment } from "@/lib/order-print-comment";
import { parseIdList } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { collectIllustrationAssetPaths } from "@/lib/illustration-versions";
import { stickerOrderExtraLabel, stickerOrderTitle } from "@/lib/templates";
import { deleteIllustrationFile, deleteStickerFile } from "@/lib/uploads";

const PRODUCTION_STATUSES: ProductionStatus[] = [
  "WAITING",
  "ILLUSTRATING",
  "UPSCALING",
  "COMPLETED",
];

function revalidateOrderPaths(orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function updateOrderProductionStatus(
  orderId: string,
  status: ProductionStatus,
) {
  await requireAdmin();

  if (!PRODUCTION_STATUSES.includes(status)) {
    return;
  }

  await prisma.storybookOrder.update({
    where: { id: orderId },
    data: { productionStatus: status },
  });

  revalidateOrderPaths(orderId);
}

export type AdminOrderDetail = {
  id: string;
  fulfillmentStatus: FulfillmentStatus;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  userName: string;
  userEmail: string;
  productTitle: string;
  printComment: string | null;
  characters: Array<{
    id: string;
    label: string;
    originalPhotoPath: string;
    generatedImagePath: string | null;
  }>;
  logs: Array<{
    id: string;
    fromStatus: FulfillmentStatus | null;
    toStatus: FulfillmentStatus;
    carrier: string | null;
    trackingNumber: string | null;
    actorName: string | null;
    createdAt: string;
  }>;
};

export type FulfillmentUpdateState = {
  error?: string;
  success?: boolean;
  order?: AdminOrderDetail;
} | undefined;

function serializeAdminOrder(order: {
  id: string;
  fulfillmentStatus: FulfillmentStatus;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  user: { name: string; email: string };
  template: { title: string };
  printComment: string | null;
  characters: AdminOrderDetail["characters"];
  statusLogs: Array<{
    id: string;
    fromStatus: FulfillmentStatus | null;
    toStatus: FulfillmentStatus;
    carrier: string | null;
    trackingNumber: string | null;
    createdAt: Date;
    actor: { name: string } | null;
  }>;
}): AdminOrderDetail {
  return {
    id: order.id,
    fulfillmentStatus: order.fulfillmentStatus,
    shippingCarrier: order.shippingCarrier,
    trackingNumber: order.trackingNumber,
    userName: order.user.name,
    userEmail: order.user.email,
    productTitle: order.template.title,
    printComment: order.printComment,
    characters: order.characters,
    logs: order.statusLogs.map((log) => ({
      id: log.id,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      carrier: log.carrier,
      trackingNumber: log.trackingNumber,
      actorName: log.actor?.name ?? null,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

async function loadAdminOrderDetail(orderId: string) {
  const order = await prisma.storybookOrder.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
      template: { select: { title: true } },
      statusLogs: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actor: { select: { name: true } } },
      },
    },
  });

  if (!order) {
    return null;
  }

  const characterIds = parseIdList(order.selectedCharacterIds);
  const characters = characterIds.length
    ? await prisma.character.findMany({
        where: { id: { in: characterIds }, userId: order.userId },
        select: {
          id: true,
          label: true,
          originalPhotoPath: true,
          generatedImagePath: true,
        },
      })
    : [];
  const characterMap = new Map(characters.map((character) => [character.id, character]));

  return serializeAdminOrder({
    ...order,
    printComment: await loadOrderPrintComment(orderId),
    characters: characterIds
      .map((id) => characterMap.get(id))
      .filter((character) => character !== undefined),
  });
}

export async function getAdminOrderDetail(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  await requireAdmin();
  return loadAdminOrderDetail(orderId);
}

export async function updateOrderFulfillment(
  _prev: FulfillmentUpdateState | undefined,
  formData: FormData,
): Promise<FulfillmentUpdateState> {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "").trim();
  const nextStatusRaw = String(formData.get("status") ?? "").trim();
  const carrier = String(formData.get("carrier") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();

  if (!orderId || !isFulfillmentStatus(nextStatusRaw)) {
    return { error: "상태 값이 올바르지 않습니다." };
  }

  const existing = await prisma.storybookOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      fulfillmentStatus: true,
      shippingCarrier: true,
      trackingNumber: true,
    },
  });

  if (!existing) {
    return { error: "주문을 찾을 수 없습니다." };
  }

  if (!canTransitionFulfillment(existing.fulfillmentStatus, nextStatusRaw)) {
    return { error: "바로 다음 상태로만 변경할 수 있습니다." };
  }

  const movingToShipping =
    nextStatusRaw === "SHIPPING" && existing.fulfillmentStatus !== "SHIPPING";

  if (movingToShipping && (!carrier || !trackingNumber)) {
    return { error: "배송중으로 변경하려면 택배사와 운송장번호를 입력해 주세요." };
  }

  if (existing.fulfillmentStatus === nextStatusRaw) {
    return {
      success: true,
      order: (await loadAdminOrderDetail(orderId)) ?? undefined,
    };
  }

  const keepShippingInfo =
    nextStatusRaw === "SHIPPING" || nextStatusRaw === "DELIVERED";

  await prisma.$transaction([
    prisma.storybookOrder.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: nextStatusRaw,
        shippingCarrier: keepShippingInfo
          ? carrier || existing.shippingCarrier
          : existing.shippingCarrier,
        trackingNumber: keepShippingInfo
          ? trackingNumber || existing.trackingNumber
          : existing.trackingNumber,
      },
    }),
    prisma.orderStatusLog.create({
      data: {
        orderId,
        fromStatus: existing.fulfillmentStatus,
        toStatus: nextStatusRaw,
        carrier: nextStatusRaw === "SHIPPING" ? carrier || null : null,
        trackingNumber: nextStatusRaw === "SHIPPING" ? trackingNumber || null : null,
        actorId: admin.id,
      },
    }),
  ]);

  revalidateOrderPaths(orderId);
  revalidatePath("/mypage");
  revalidatePath("/mypage/reviews");
  revalidatePath("/dashboard");

  const order = await loadAdminOrderDetail(orderId);
  return { success: true, order: order ?? undefined };
}

export async function deleteOrder(orderId: string) {
  await requireAdmin();

  const order = await prisma.storybookOrder.findUnique({
    where: { id: orderId },
    include: {
      illustrations: {
        select: {
          imagePath: true,
          sceneImagePath: true,
          upscaledImagePath: true,
          imageVersions: true,
        },
      },
    },
  });

  if (!order) {
    return { error: "주문을 찾을 수 없습니다." };
  }

  for (const illustration of order.illustrations) {
    for (const path of collectIllustrationAssetPaths(illustration)) {
      await deleteIllustrationFile(path);
    }
  }

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { storybookOrderId: orderId } }),
    prisma.illustration.deleteMany({ where: { orderId } }),
    prisma.photoAlbumPage.deleteMany({ where: { orderId } }),
    prisma.storybookOrder.delete({ where: { id: orderId } }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/illustrations");
  revalidatePath(`/admin/illustrations/${orderId}`);
  revalidatePath("/admin/upscale");
  revalidatePath(`/admin/upscale/${orderId}`);
  revalidatePath("/dashboard");
  revalidatePath("/mypage");
  return { success: true };
}

export type AdminStickerOrderDetail = {
  id: string;
  userName: string;
  userEmail: string;
  productTitle: string;
  phrase: string;
  sizeLabel: string;
  sheetCount: number;
  quantity: number;
  paymentStatus: PaymentStatus;
  previewStatus: StickerPreviewStatus;
  productionStatus: ProductionStatus;
  fulfillmentStatus: FulfillmentStatus;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  errorReason: string | null;
  checkoutEmail: string | null;
  checkoutPhone: string | null;
  shippingName: string | null;
  shippingPostalCode: string | null;
  shippingAddress: string | null;
  shippingAddressDetail: string | null;
  previewImagePath: string | null;
  compositeImagePath: string | null;
  finalImagePath: string | null;
  character: {
    id: string;
    label: string;
    originalPhotoPath: string;
    generatedImagePath: string | null;
  };
};

export type StickerFulfillmentUpdateState = {
  error?: string;
  success?: boolean;
  order?: AdminStickerOrderDetail;
} | undefined;

function serializeAdminStickerOrder(order: {
  id: string;
  phrase: string;
  sheetCount: number;
  quantity: number;
  paymentStatus: PaymentStatus;
  previewStatus: StickerPreviewStatus;
  productionStatus: ProductionStatus;
  fulfillmentStatus: FulfillmentStatus;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  errorReason: string | null;
  checkoutEmail: string | null;
  checkoutPhone: string | null;
  shippingName: string | null;
  shippingPostalCode: string | null;
  shippingAddress: string | null;
  shippingAddressDetail: string | null;
  previewImagePath: string | null;
  compositeImagePath: string | null;
  finalImagePath: string | null;
  user: { name: string; email: string };
  character: AdminStickerOrderDetail["character"];
  sizeOption: { label: string };
  border: { label: string } | null;
  template: { label: string } | null;
}): AdminStickerOrderDetail {
  return {
    id: order.id,
    userName: order.user.name,
    userEmail: order.user.email,
    productTitle: stickerOrderTitle(
      order.character.label,
      stickerOrderExtraLabel(order),
    ),
    phrase: order.phrase,
    sizeLabel: order.sizeOption.label,
    sheetCount: order.sheetCount,
    quantity: order.quantity,
    paymentStatus: order.paymentStatus,
    previewStatus: order.previewStatus,
    productionStatus: order.productionStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    shippingCarrier: order.shippingCarrier,
    trackingNumber: order.trackingNumber,
    errorReason: order.errorReason,
    checkoutEmail: order.checkoutEmail,
    checkoutPhone: order.checkoutPhone,
    shippingName: order.shippingName,
    shippingPostalCode: order.shippingPostalCode,
    shippingAddress: order.shippingAddress,
    shippingAddressDetail: order.shippingAddressDetail,
    previewImagePath: order.previewImagePath,
    compositeImagePath: order.compositeImagePath,
    finalImagePath: order.finalImagePath,
    character: order.character,
  };
}

async function loadAdminStickerOrderDetail(orderId: string) {
  const order = await prisma.stickerOrder.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
      character: {
        select: {
          id: true,
          label: true,
          originalPhotoPath: true,
          generatedImagePath: true,
        },
      },
      border: { select: { label: true } },
      template: { select: { label: true } },
      sizeOption: { select: { label: true } },
    },
  });

  if (!order) {
    return null;
  }

  return serializeAdminStickerOrder(order);
}

export async function getAdminStickerOrderDetail(
  orderId: string,
): Promise<AdminStickerOrderDetail | null> {
  await requireAdmin();
  return loadAdminStickerOrderDetail(orderId);
}

export async function updateStickerOrderFulfillment(
  _prev: StickerFulfillmentUpdateState | undefined,
  formData: FormData,
): Promise<StickerFulfillmentUpdateState> {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "").trim();
  const nextStatusRaw = String(formData.get("status") ?? "").trim();
  const carrier = String(formData.get("carrier") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();

  if (!orderId || !isFulfillmentStatus(nextStatusRaw)) {
    return { error: "상태 값이 올바르지 않습니다." };
  }

  const existing = await prisma.stickerOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      shippingCarrier: true,
      trackingNumber: true,
    },
  });

  if (!existing) {
    return { error: "주문을 찾을 수 없습니다." };
  }

  if (existing.paymentStatus !== "PAID") {
    return { error: "결제 완료된 주문만 상태를 변경할 수 있습니다." };
  }

  if (!canTransitionFulfillment(existing.fulfillmentStatus, nextStatusRaw)) {
    return { error: "바로 다음 상태로만 변경할 수 있습니다." };
  }

  const movingToShipping =
    nextStatusRaw === "SHIPPING" && existing.fulfillmentStatus !== "SHIPPING";

  if (movingToShipping && (!carrier || !trackingNumber)) {
    return { error: "배송중으로 변경하려면 택배사와 운송장번호를 입력해 주세요." };
  }

  if (existing.fulfillmentStatus === nextStatusRaw) {
    return {
      success: true,
      order: (await loadAdminStickerOrderDetail(orderId)) ?? undefined,
    };
  }

  const keepShippingInfo =
    nextStatusRaw === "SHIPPING" || nextStatusRaw === "DELIVERED";

  await prisma.stickerOrder.update({
    where: { id: orderId },
    data: {
      fulfillmentStatus: nextStatusRaw,
      shippingCarrier: keepShippingInfo
        ? carrier || existing.shippingCarrier
        : existing.shippingCarrier,
      trackingNumber: keepShippingInfo
        ? trackingNumber || existing.trackingNumber
        : existing.trackingNumber,
    },
  });

  revalidateOrderPaths(orderId);
  revalidatePath("/mypage");
  revalidatePath("/mypage/reviews");
  revalidatePath("/dashboard");

  return {
    success: true,
    order: (await loadAdminStickerOrderDetail(orderId)) ?? undefined,
  };
}

export async function deleteAdminStickerOrder(orderId: string) {
  await requireAdmin();

  const order = await prisma.stickerOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      previewImagePath: true,
      finalImagePath: true,
      compositeImagePath: true,
    },
  });

  if (!order) {
    return { error: "주문을 찾을 수 없습니다." };
  }

  await deleteStickerFile(order.previewImagePath);
  await deleteStickerFile(order.finalImagePath);
  await deleteStickerFile(order.compositeImagePath);

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { stickerOrderId: orderId } }),
    prisma.stickerOrder.delete({ where: { id: orderId } }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/dashboard");
  revalidatePath("/mypage");
  return { success: true };
}
