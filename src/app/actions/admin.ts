"use server";

import { revalidatePath } from "next/cache";
import type { ProductionStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { deleteIllustrationFile } from "@/lib/uploads";

const PRODUCTION_STATUSES: ProductionStatus[] = [
  "WAITING",
  "ILLUSTRATING",
  "UPSCALING",
  "COMPLETED",
];

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

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
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
