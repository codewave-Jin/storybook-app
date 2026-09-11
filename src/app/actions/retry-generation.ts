"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { enqueueIllustrationGenerations } from "@/lib/enqueue-illustration-generation";
import { queueStickerGenerationJobs } from "@/lib/enqueue-sticker-generation";
import { prisma } from "@/lib/prisma";

export type RetryGenerationState = {
  error?: string;
  success?: boolean;
};

export async function retryFailedIllustrations(
  illustrationIds: string[],
): Promise<RetryGenerationState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "로그인이 필요합니다." };
  }

  const ids = illustrationIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return { error: "다시 만들 장면을 찾을 수 없습니다." };
  }

  const pages = await prisma.illustration.findMany({
    where: {
      id: { in: ids },
      status: "FAILED",
      order: { userId: session.user.id },
    },
    select: {
      id: true,
      orderId: true,
      prompt: true,
    },
  });

  const ready = pages.filter((page) => page.prompt.trim());
  if (ready.length === 0) {
    return { error: "다시 만들 수 있는 실패한 장면이 없습니다." };
  }

  try {
    await enqueueIllustrationGenerations(ready.map((page) => page.id));
  } catch (error) {
    console.error("[retry-generation] illustration retry failed", error);
    return { error: "다시 만들기에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  const orderIds = [...new Set(ready.map((page) => page.orderId))];
  revalidatePath("/dashboard");
  for (const orderId of orderIds) {
    revalidatePath(`/dashboard/orders/${orderId}/preview`);
  }

  return { success: true };
}

export async function retryFailedStickerPreview(
  orderId: string,
): Promise<RetryGenerationState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "로그인이 필요합니다." };
  }

  const id = orderId.trim();
  if (!id) {
    return { error: "주문을 찾을 수 없습니다." };
  }

  const order = await prisma.stickerOrder.findFirst({
    where: {
      id,
      userId: session.user.id,
      previewStatus: "FAILED",
    },
    select: { id: true },
  });

  if (!order) {
    return { error: "다시 만들 수 있는 실패한 스티커가 없습니다." };
  }

  try {
    await queueStickerGenerationJobs(order.id, { force: true });
  } catch (error) {
    console.error("[retry-generation] sticker retry failed", error);
    return { error: "다시 만들기에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/sticker/${order.id}/preview`);
  return { success: true };
}
