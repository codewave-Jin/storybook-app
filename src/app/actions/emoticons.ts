"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { refundTokenHoldsForOrder } from "@/lib/tokens";
import { deleteStickerFile } from "@/lib/uploads";

export async function deleteEmoticonOrder(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const order = await prisma.emoticonOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: { id: true, sheetImagePath: true, cellImagePaths: true, paymentStatus: true },
  });
  if (!order) {
    return { error: "이모티콘을 찾을 수 없습니다." };
  }

  if (order.paymentStatus !== "PAID") {
    await refundTokenHoldsForOrder(session.user.id, "EMOTICON_PREVIEW", order.id);
  }

  await deleteStickerFile(order.sheetImagePath);
  for (const imagePath of order.cellImagePaths) {
    await deleteStickerFile(imagePath);
  }
  await prisma.emoticonOrder.delete({ where: { id: order.id } });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/emoticon/${orderId}`);
  return { success: true };
}
