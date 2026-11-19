import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  attachTokenHoldToOrder,
  consumeTokenHold,
  getCharacterSlotAndTokens,
  refundTokenHold,
} from "@/lib/tokens";
import { runWordbookGeneration } from "@/lib/wordbook-generate";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 주문을 먼저 만들고 바로 돌려준 뒤, 표정 2장은 백그라운드에서 그린다.
 * 화면은 주문 페이지에서 상태를 확인하며 기다린다.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { characterId?: unknown } | null;
  const characterId = typeof body?.characterId === "string" ? body.characterId.trim() : "";
  if (!characterId) {
    return NextResponse.json({ error: "주인공 캐릭터를 골라 주세요." }, { status: 400 });
  }

  const userId = session.user.id;
  const character = await prisma.character.findFirst({
    where: { id: characterId, userId, deletedAt: null },
    select: { id: true, generatedImagePath: true, status: true },
  });
  if (!character || character.status !== "COMPLETED" || !character.generatedImagePath) {
    return NextResponse.json({ error: "완성된 캐릭터를 골라 주세요." }, { status: 400 });
  }

  const hold = await consumeTokenHold(userId, "WORDBOOK_PREVIEW");
  if (!hold.success || !hold.holdId) {
    return NextResponse.json({ error: hold.message ?? "토큰이 부족합니다" }, { status: 400 });
  }

  let orderId: string;
  try {
    const order = await prisma.wordbookOrder.create({
      data: {
        userId,
        email: session.user.email ?? null,
        characterId: character.id,
        baseImagePath: character.generatedImagePath,
        status: "GENERATING",
      },
      select: { id: true },
    });
    orderId = order.id;
    await attachTokenHoldToOrder(userId, hold.holdId, orderId);
  } catch (error) {
    await refundTokenHold(userId, hold.holdId);
    console.error("[wordbook] create failed", error);
    return NextResponse.json(
      { error: "단어 그림책을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }

  waitUntil(
    runWordbookGeneration(orderId).catch((error) => {
      console.error("[wordbook] background failed", orderId, error);
    }),
  );

  const { tokens } = await getCharacterSlotAndTokens(userId);
  return NextResponse.json({ orderId, tokens }, { status: 202 });
}
