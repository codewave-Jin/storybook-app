import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { unauthorizedIfInvalidInternalKey } from "@/lib/internal-auth";
import { isComfyMockEnabled } from "@/lib/comfy-server";
import { enqueueAndKickGptImageJob } from "@/lib/gpt-image-queue";
import { GPT_IMAGE_JOB_KIND } from "@/lib/gpt-image-queue-config";
import { prisma } from "@/lib/prisma";
import { finishStyleTransferAndStartIllustrations } from "@/lib/storybook-generation";

export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const unauthorized = unauthorizedIfInvalidInternalKey(request);
  if (unauthorized) {
    return unauthorized;
  }

  const order = await prisma.storybookOrder.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    pageNumbers?: unknown;
  } | null;
  const pageNumbers = Array.isArray(body?.pageNumbers)
    ? body.pageNumbers.filter(
        (value): value is number =>
          typeof value === "number" && Number.isInteger(value) && value > 0,
      )
    : [];

  if (pageNumbers.length === 0) {
    return NextResponse.json({ error: "pageNumbers required" }, { status: 400 });
  }

  if (isComfyMockEnabled()) {
    waitUntil(
      finishStyleTransferAndStartIllustrations({
        orderId: order.id,
        pageNumbers,
        wait: false,
      }).catch((error) => {
        console.error(
          "[style-character] background style transfer failed",
          order.id,
          error,
        );
      }),
    );
    return NextResponse.json(
      { ok: true, accepted: true, orderId: order.id, queued: false },
      { status: 202 },
    );
  }

  await enqueueAndKickGptImageJob({
    kind: GPT_IMAGE_JOB_KIND.STYLE_CHARACTER,
    targetId: order.id,
    inputImages: 2,
    payload: { pageNumbers },
  });

  return NextResponse.json(
    { ok: true, accepted: true, orderId: order.id, queued: true },
    { status: 202 },
  );
}
