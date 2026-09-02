import { NextResponse } from "next/server";
import { unauthorizedIfInvalidInternalKey } from "@/lib/internal-auth";
import { defaultExpectedDeliveryAt } from "@/lib/fulfillment";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import { startOrderPaidGeneration } from "@/lib/preview-generation";
import { prisma } from "@/lib/prisma";

type PaymentWebhookBody = {
  orderId?: unknown;
  paymentStatus?: unknown;
};

/**
 * 결제 웹훅: paymentStatus가 PAID로 바뀔 때 나머지 Illustration row insert + 생성 트리거.
 * 이미 row가 있으면 skip (idempotent).
 */
export async function POST(request: Request) {
  if (!PAYMENTS_ENABLED) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "payments disabled",
    });
  }

  const unauthorized = unauthorizedIfInvalidInternalKey(request);
  if (unauthorized) {
    return unauthorized;
  }

  let body: PaymentWebhookBody;
  try {
    body = (await request.json()) as PaymentWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const paymentStatus =
    typeof body.paymentStatus === "string" ? body.paymentStatus.trim() : "";

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  if (paymentStatus !== "PAID") {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "paymentStatus is not PAID",
    });
  }

  const order = await prisma.storybookOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      paymentStatus: true,
      expectedDeliveryAt: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.paymentStatus !== "PAID") {
    await prisma.storybookOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        expectedDeliveryAt:
          order.expectedDeliveryAt ?? defaultExpectedDeliveryAt(new Date()),
      },
    });
  }

  await startOrderPaidGeneration(orderId);

  return NextResponse.json({ ok: true, orderId });
}
