import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { enqueueStickerGeneration } from "@/lib/enqueue-sticker-generation";
import { shouldKickPendingStickerPreview } from "@/lib/sticker-generation-policy";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const order = await prisma.stickerOrder.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: {
      id: true,
      previewImagePath: true,
      previewStatus: true,
      errorReason: true,
      productionStatus: true,
      createdAt: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (shouldKickPendingStickerPreview(order)) {
    void enqueueStickerGeneration(order.id);
  }

  return NextResponse.json({
    previewImagePath: order.previewImagePath,
    previewStatus: order.previewStatus,
    errorReason: order.errorReason,
    productionStatus: order.productionStatus,
  });
}
