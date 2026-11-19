import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PAYMENTS_ENABLED, WORDBOOK_PRICE_TOKENS } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import {
  consumeTokens,
  getCharacterSlotAndTokens,
  refundTokenHoldsForOrder,
  restoreTokenSpend,
} from "@/lib/tokens";

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
  const userId = session.user.id;

  const order = await prisma.wordbookOrder.findFirst({
    where: { id: params.id, userId },
    select: { id: true, status: true, paymentStatus: true },
  });
  if (!order) {
    return NextResponse.json({ error: "단어 그림책을 찾을 수 없습니다." }, { status: 404 });
  }

  if (order.paymentStatus !== "PAID") {
    if (order.status !== "READY") {
      return NextResponse.json(
        { error: "표정 3가지가 모두 준비된 뒤에 결제할 수 있어요." },
        { status: 400 },
      );
    }
    const spent = await consumeTokens(userId, WORDBOOK_PRICE_TOKENS, "WORDBOOK_ORDER");
    if (!spent.success) {
      return NextResponse.json({ error: spent.message ?? "토큰이 부족합니다" }, { status: 400 });
    }
    try {
      await prisma.wordbookOrder.update({
        where: { id: order.id },
        data: { paymentStatus: "PAID" },
      });
    } catch (error) {
      await restoreTokenSpend(userId, spent);
      console.error("[wordbook] pay failed", error);
      return NextResponse.json({ error: "주문 정보를 저장하지 못했습니다." }, { status: 500 });
    }
    await refundTokenHoldsForOrder(userId, "WORDBOOK_PREVIEW", order.id);
  }

  const { tokens } = await getCharacterSlotAndTokens(userId);
  return NextResponse.json({ paid: true, tokens });
}
