import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isOpenAIRateLimitError } from "@/lib/openai-rate-limit";
import { WORDBOOK_FREE_REGEN } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { attachTokenHoldToOrder, consumeTokenHold, refundTokenHold } from "@/lib/tokens";
import {
  regenerateWordbookExpression,
  runWordbookGeneration,
  wordbookRegenField,
} from "@/lib/wordbook-generate";
import { parseWordbookExpression } from "@/lib/wordbook-prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * body.expression 이 있으면 그 표정 하나를 다시 그린다 (표정마다 무료 횟수 제한).
 * body.retry 가 true 이면 실패한 주문에서 빠진 표정을 다시 그린다 (미리보기 토큰 1개 다시 사용).
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const userId = session.user.id;

  const body = (await request.json().catch(() => null)) as {
    expression?: unknown;
    retry?: unknown;
  } | null;

  const order = await prisma.wordbookOrder.findFirst({
    where: { id: params.id, userId },
    select: {
      id: true,
      status: true,
      curiousRegenCount: true,
      surprisedRegenCount: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "단어 그림책을 찾을 수 없습니다." }, { status: 404 });
  }

  if (body?.retry === true) {
    if (order.status !== "FAILED") {
      return NextResponse.json({ error: "다시 시도할 작업이 없어요." }, { status: 400 });
    }
    const hold = await consumeTokenHold(userId, "WORDBOOK_PREVIEW");
    if (!hold.success || !hold.holdId) {
      return NextResponse.json({ error: hold.message ?? "토큰이 부족합니다" }, { status: 400 });
    }
    const claimed = await prisma.wordbookOrder.updateMany({
      where: { id: order.id, status: "FAILED" },
      data: { status: "GENERATING", errorReason: null },
    });
    if (claimed.count === 0) {
      await refundTokenHold(userId, hold.holdId);
      return NextResponse.json({ error: "이미 다시 그리는 중이에요." }, { status: 409 });
    }
    await attachTokenHoldToOrder(userId, hold.holdId, order.id);
    waitUntil(
      runWordbookGeneration(order.id).catch((error) => {
        console.error("[wordbook] retry failed", order.id, error);
      }),
    );
    return NextResponse.json({ ok: true, status: "GENERATING" }, { status: 202 });
  }

  const expression = parseWordbookExpression(body?.expression);
  if (!expression) {
    return NextResponse.json({ error: "다시 그릴 표정을 골라 주세요." }, { status: 400 });
  }
  if (order.status !== "READY") {
    return NextResponse.json({ error: "표정이 모두 준비된 뒤에 다시 그릴 수 있어요." }, { status: 400 });
  }
  if (order[wordbookRegenField(expression)] >= WORDBOOK_FREE_REGEN) {
    return NextResponse.json(
      { error: `이 표정은 ${WORDBOOK_FREE_REGEN}번까지 다시 그릴 수 있어요.` },
      { status: 400 },
    );
  }

  try {
    await regenerateWordbookExpression({ orderId: order.id, userId, expression });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isOpenAIRateLimitError(error)) {
      return NextResponse.json(
        { error: "요청이 몰려 있어요. 잠시 후 다시 시도해 주세요." },
        { status: 429 },
      );
    }
    console.error("[wordbook] regenerate failed", order.id, error);
    return NextResponse.json(
      { error: "표정을 다시 그리지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
