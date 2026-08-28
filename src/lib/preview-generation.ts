import { prisma } from "@/lib/prisma";
import {
  markOrderPreviewGeneratedIfReady,
  revalidateOrderPreview,
} from "@/lib/preview-status";
import {
  ensureIllustrationsAndGenerate,
  paidPageNumbers,
  PREVIEW_PAGE_NUMBERS,
} from "@/lib/storybook-generation";

export { markOrderPreviewGeneratedIfReady, revalidateOrderPreview };

/** 주문 생성 직후: 표지+본문 2장만 insert + 생성 트리거 (기존 row skip) */
export async function startOrderPreviewGeneration(
  orderId: string,
  options?: { wait?: boolean },
) {
  await ensureIllustrationsAndGenerate({
    orderId,
    pageNumbers: [...PREVIEW_PAGE_NUMBERS],
    wait: options?.wait ?? false,
  });
  await markOrderPreviewGeneratedIfReady(orderId);
}

/** 결제 PAID 이후: 나머지 페이지 insert + 생성 트리거 (기존 row skip) */
export async function startOrderPaidGeneration(
  orderId: string,
  options?: { wait?: boolean },
) {
  const order = await prisma.storybookOrder.findUnique({
    where: { id: orderId },
    select: { id: true, paymentStatus: true },
  });

  if (!order || order.paymentStatus !== "PAID") {
    return;
  }

  await prisma.storybookOrder.updateMany({
    where: {
      id: orderId,
      paymentStatus: "PAID",
      productionStatus: "WAITING",
    },
    data: { productionStatus: "ILLUSTRATING" },
  });

  await ensureIllustrationsAndGenerate({
    orderId,
    pageNumbers: paidPageNumbers(),
    wait: options?.wait ?? false,
  });

  revalidateOrderPreview(orderId);
}
