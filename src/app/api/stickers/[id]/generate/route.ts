import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { unauthorizedIfInvalidInternalKey } from "@/lib/internal-auth";
import { runStickerPreviewGeneration } from "@/lib/sticker-generation";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const unauthorized = unauthorizedIfInvalidInternalKey(request);
  if (unauthorized) {
    return unauthorized;
  }

  const order = await prisma.stickerOrder.findUnique({
    where: { id: params.id },
    select: { id: true, previewImagePath: true, previewStatus: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Sticker order not found" }, { status: 404 });
  }

  if (order.previewImagePath || order.previewStatus === "COMPLETED") {
    return NextResponse.json({ ok: true, skipped: true, reason: "has preview" });
  }

  if (order.previewStatus === "PROCESSING") {
    return NextResponse.json({ ok: true, skipped: true, reason: "processing" });
  }

  waitUntil(
    runStickerPreviewGeneration(order.id).catch((error) => {
      console.error("[sticker generate] background failed", order.id, error);
    }),
  );

  return NextResponse.json(
    { ok: true, accepted: true, orderId: order.id },
    { status: 202 },
  );
}
