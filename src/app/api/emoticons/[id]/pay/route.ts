import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EMOTICON_PACK_TOKENS, PAYMENTS_ENABLED } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { consumeTokens, getCharacterSlotAndTokens, refundTokenHoldsForOrder, restoreTokenSpend } from "@/lib/tokens";

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
    const spent = await consumeTokens(
      session.user.id,
      EMOTICON_PACK_TOKENS,
      "EMOTICON_ORDER",
    );
    if (!spent.success) {
      return NextResponse.json(
        { error: spent.message ?? "토큰이 부족합니다" },
        { status: 400 },
      );
    }
    try {
      await prisma.emoticonOrder.update({
        where: { id: order.id },
        data: { paymentStatus: "PAID" },
      });
    } catch (error) {
      await restoreTokenSpend(session.user.id, spent);
      console.error("[emoticon] pay failed", error);
      return NextResponse.json(
        { error: "주문 정보를 저장하지 못했습니다." },
        { status: 500 },
      );
    }
    await refundTokenHoldsForOrder(session.user.id, "EMOTICON_PREVIEW", order.id);
  }

  const { tokens } = await getCharacterSlotAndTokens(session.user.id);
  return NextResponse.json({ paid: true, tokens });
}
