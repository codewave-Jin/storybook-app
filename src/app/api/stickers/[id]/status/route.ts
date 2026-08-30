import { NextResponse } from "next/server";
import { auth } from "@/auth";
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
      previewImagePath: true,
      productionStatus: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    previewImagePath: order.previewImagePath,
    productionStatus: order.productionStatus,
  });
}
