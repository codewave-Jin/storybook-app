"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  albumLayoutById,
  clampAlbumFocus,
  isAlbumComplete,
  parseAlbumSlotPhotos,
  serializeAlbumSlotPhotos,
} from "@/lib/photo-album";
import { parsePrintComment } from "@/lib/print-comment";
import { saveOrderPrintComment } from "@/lib/order-print-comment";
import { addOrderAlbumSpread, removeOrderAlbumSpread } from "@/lib/photo-album-pages";
import { prisma } from "@/lib/prisma";
import { deletePublicFile, saveAlbumPhoto } from "@/lib/uploads";

export type SaveAlbumPhotoState = {
  error?: string;
  success?: boolean;
  photoPath?: string;
} | undefined;

async function findPaidAlbumPage(orderId: string, pageId: string, slotId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!orderId || !pageId || !slotId) {
    return { error: "사진첩 정보를 찾을 수 없습니다." as const };
  }

  const page = await prisma.photoAlbumPage.findFirst({
    where: {
      id: pageId,
      order: {
        id: orderId,
        userId: session.user.id,
        paymentStatus: "PAID",
        includePhotoAlbum: true,
      },
    },
    include: {
      order: { select: { fulfillmentStatus: true } },
    },
  });

  if (!page) {
    return { error: "사진첩을 찾을 수 없습니다." as const };
  }

  if (page.order.fulfillmentStatus !== "PREPARING") {
    return { error: "인쇄 의뢰가 끝나 사진을 바꿀 수 없습니다." as const };
  }

  const layout = albumLayoutById(page.layoutId);
  if (!layout.slots.some((slot) => slot.id === slotId)) {
    return { error: "사진 칸을 찾을 수 없습니다." as const };
  }

  return { page };
}

export async function saveAlbumSlotPhoto(
  _prevState: SaveAlbumPhotoState,
  formData: FormData,
): Promise<SaveAlbumPhotoState> {
  const orderId = String(formData.get("orderId") ?? "").trim();
  const pageId = String(formData.get("pageId") ?? "").trim();
  const slotId = String(formData.get("slotId") ?? "").trim();
  const file = formData.get("photo");

  const found = await findPaidAlbumPage(orderId, pageId, slotId);
  if ("error" in found) {
    return { error: found.error };
  }
  const { page } = found;

  if (!(file instanceof File) || file.size < 1) {
    return { error: "사진을 선택해 주세요." };
  }

  let photoPath: string;
  try {
    photoPath = await saveAlbumPhoto(file);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "사진을 올리지 못했습니다.",
    };
  }

  const current = parseAlbumSlotPhotos(page.photoPaths);
  const previous = current[slotId]?.path;
  current[slotId] = { path: photoPath, x: 50, y: 50 };

  await prisma.photoAlbumPage.update({
    where: { id: page.id },
    data: { photoPaths: serializeAlbumSlotPhotos(current) },
  });

  if (previous && previous !== photoPath) {
    await deletePublicFile(previous);
  }

  revalidatePath(`/dashboard/orders/${orderId}/album`);
  revalidatePath(`/dashboard/orders/${orderId}/preview`);
  return { success: true, photoPath };
}

export async function saveAlbumSlotPosition(input: {
  orderId: string;
  pageId: string;
  slotId: string;
  x: number;
  y: number;
}) {
  const orderId = input.orderId.trim();
  const pageId = input.pageId.trim();
  const slotId = input.slotId.trim();
  const x = Math.round(clampAlbumFocus(input.x) * 10) / 10;
  const y = Math.round(clampAlbumFocus(input.y) * 10) / 10;

  const found = await findPaidAlbumPage(orderId, pageId, slotId);
  if ("error" in found) {
    return { error: found.error };
  }

  const current = parseAlbumSlotPhotos(found.page.photoPaths);
  const existing = current[slotId];
  if (!existing) {
    return { error: "사진을 먼저 넣어 주세요." };
  }

  current[slotId] = { ...existing, x, y };
  await prisma.photoAlbumPage.update({
    where: { id: found.page.id },
    data: { photoPaths: serializeAlbumSlotPhotos(current) },
  });

  return { success: true as const };
}

export type AddAlbumSpreadState = {
  error?: string;
  success?: boolean;
  spreadIndex?: number;
} | undefined;

export async function addAlbumSpread(
  _prev: AddAlbumSpreadState,
  formData: FormData,
): Promise<AddAlbumSpreadState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    return { error: "사진첩 정보를 찾을 수 없습니다." };
  }

  const order = await prisma.storybookOrder.findFirst({
    where: {
      id: orderId,
      userId: session.user.id,
      paymentStatus: "PAID",
      includePhotoAlbum: true,
    },
    select: { id: true, fulfillmentStatus: true },
  });

  if (!order) {
    return { error: "사진첩을 찾을 수 없습니다." };
  }

  if (order.fulfillmentStatus !== "PREPARING") {
    return { error: "인쇄 의뢰가 끝나 페이지를 추가할 수 없습니다." };
  }

  const result = await addOrderAlbumSpread(order.id);
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/orders/${order.id}/album`);
  return {
    success: true,
    spreadIndex: result.spreadIndex,
  };
}

export type RemoveAlbumSpreadState = {
  error?: string;
  success?: boolean;
  spreadIndex?: number;
} | undefined;

export async function removeAlbumSpread(
  _prev: RemoveAlbumSpreadState,
  formData: FormData,
): Promise<RemoveAlbumSpreadState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  const spreadIndex = Number(formData.get("spreadIndex"));
  if (!orderId) {
    return { error: "사진첩 정보를 찾을 수 없습니다." };
  }

  const order = await prisma.storybookOrder.findFirst({
    where: {
      id: orderId,
      userId: session.user.id,
      paymentStatus: "PAID",
      includePhotoAlbum: true,
    },
    select: { id: true, fulfillmentStatus: true },
  });

  if (!order) {
    return { error: "사진첩을 찾을 수 없습니다." };
  }

  if (order.fulfillmentStatus !== "PREPARING") {
    return { error: "인쇄 의뢰가 끝나 페이지를 삭제할 수 없습니다." };
  }

  const result = await removeOrderAlbumSpread(order.id, spreadIndex);
  if ("error" in result) {
    return { error: result.error };
  }

  for (const photoPath of result.photoPaths) {
    await deletePublicFile(photoPath);
  }

  revalidatePath(`/dashboard/orders/${order.id}/album`);
  return {
    success: true,
    spreadIndex: result.spreadIndex,
  };
}

export type RequestAlbumPrintState = {
  error?: string;
} | undefined;

export async function requestAlbumPrint(
  _prev: RequestAlbumPrintState,
  formData: FormData,
): Promise<RequestAlbumPrintState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    return { error: "주문 정보를 찾을 수 없습니다." };
  }

  const order = await prisma.storybookOrder.findFirst({
    where: {
      id: orderId,
      userId: session.user.id,
      paymentStatus: "PAID",
      includePhotoAlbum: true,
    },
    include: {
      photoAlbumPages: {
        orderBy: { pageNumber: "asc" },
        select: { layoutId: true, photoPaths: true },
      },
    },
  });

  if (!order) {
    return { error: "사진첩을 찾을 수 없습니다." };
  }

  if (order.fulfillmentStatus !== "PREPARING") {
    redirect("/dashboard");
  }

  if (!isAlbumComplete(order.photoAlbumPages)) {
    return { error: "사진을 모든 칸에 넣은 뒤에 인쇄를 의뢰할 수 있어요." };
  }

  const parsedComment = parsePrintComment(formData.get("printComment"));
  if ("error" in parsedComment) {
    return { error: parsedComment.error };
  }

  await prisma.$transaction([
    prisma.storybookOrder.update({
      where: { id: order.id },
      data: { fulfillmentStatus: "PRINTING" },
    }),
    prisma.orderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: "PREPARING",
        toStatus: "PRINTING",
        actorId: session.user.id,
      },
    }),
  ]);

  try {
    await saveOrderPrintComment(order.id, parsedComment.comment);
  } catch (error) {
    console.error("requestAlbumPrint comment failed", error);
  }

  revalidatePath("/dashboard");
  revalidatePath("/mypage");
  revalidatePath("/admin/orders");
  revalidatePath(`/dashboard/orders/${order.id}/album`);
  revalidatePath(`/admin/orders/${order.id}`);
  redirect("/dashboard");
}
