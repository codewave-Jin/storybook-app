"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { refundTokenHoldsForOrder } from "@/lib/tokens";
import { deleteStickerFile } from "@/lib/uploads";

export async function deleteWordbookOrder(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const order = await prisma.wordbookOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      curiousImagePath: true,
      surprisedImagePath: true,
    },
  });
  if (!order) {
    return { error: "단어 그림책을 찾을 수 없습니다." };
  }
  if (order.status === "GENERATING") {
    return { error: "표정을 그리는 중에는 지울 수 없어요. 끝난 뒤에 다시 시도해 주세요." };
  }

  if (order.paymentStatus !== "PAID") {
    await refundTokenHoldsForOrder(session.user.id, "WORDBOOK_PREVIEW", order.id);
  }

  // 기본 표정은 캐릭터 이미지를 같이 쓰므로 지우지 않는다.
  await deleteStickerFile(order.curiousImagePath).catch(() => undefined);
  await deleteStickerFile(order.surprisedImagePath).catch(() => undefined);
  await prisma.wordbookOrder.delete({ where: { id: order.id } });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/wordbook/${orderId}`);
  return { success: true };
}
