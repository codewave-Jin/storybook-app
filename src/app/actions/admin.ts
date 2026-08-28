"use server";

import { revalidatePath } from "next/cache";
import type { FulfillmentStatus, ProductionStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import {
  canTransitionFulfillment,
  isFulfillmentStatus,
} from "@/lib/fulfillment";
import { parseIdList } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { deleteIllustrationFile } from "@/lib/uploads";

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
        select: { imagePath: true, upscaledImagePath: true },
      },
    },
  });

  if (!order) {
    return;
  }

  for (const illustration of order.illustrations) {
    await deleteIllustrationFile(illustration.imagePath);
    await deleteIllustrationFile(illustration.upscaledImagePath);
  }

  await prisma.$transaction([
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
}
