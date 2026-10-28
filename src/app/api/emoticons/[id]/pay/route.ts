import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!PAYMENTS_ENABLED) {
    return NextResponse.json({ error: "결제는 아직 준비 중이에요." }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const order = await prisma.emoticonOrder.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, paymentStatus: true },
  });
  if (!order) {
    return NextResponse.json({ error: "이모티콘을 찾을 수 없습니다." }, { status: 404 });
  }

  if (order.paymentStatus !== "PAID") {
    await prisma.emoticonOrder.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID" },
    });
  }

  return NextResponse.json({ paid: true });
}
