import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { composeStickerPreviewImage } from "@/lib/sticker-compose";
import { parseStickerLayout } from "@/lib/sticker-layout-constants";
import { prisma } from "@/lib/prisma";
import {
  MAX_STICKER_BODY_LENGTH,
  MAX_STICKER_TITLE_LENGTH,
  parseStickerPhrase,
} from "@/lib/sticker-phrase";

export const maxDuration = 180;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    characterId?: unknown;
    borderId?: unknown;
    phrase?: unknown;
    layout?: unknown;
    cutoutImagePath?: unknown;
    bake?: unknown;
  } | null;

  const characterId = typeof body?.characterId === "string" ? body.characterId : "";
  const borderId = typeof body?.borderId === "string" ? body.borderId.trim() : "";
  const phrase = typeof body?.phrase === "string" ? body.phrase.trim() : "";
  const cutoutImagePath =
    typeof body?.cutoutImagePath === "string" ? body.cutoutImagePath.trim() : "";
  const bake = body?.bake !== false;
  const layout = parseStickerLayout(body?.layout);
  const parts = parseStickerPhrase(phrase);

  if (!characterId || !borderId || (!parts.title && !parts.body)) {
    return NextResponse.json(
      { error: "캐릭터, 테두리, 문구를 확인해 주세요." },
      { status: 400 },
    );
  }
  if (parts.title.length > MAX_STICKER_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `제목은 ${MAX_STICKER_TITLE_LENGTH}자 이하로 입력해 주세요.` },
      { status: 400 },
    );
  }
  if (parts.body.length > MAX_STICKER_BODY_LENGTH) {
    return NextResponse.json(
      { error: `문구는 ${MAX_STICKER_BODY_LENGTH}자 이하로 입력해 주세요.` },
      { status: 400 },
    );
  }

  const [character, border] = await Promise.all([
    prisma.character.findFirst({
      where: { id: characterId, userId: session.user.id },
      select: { generatedImagePath: true, status: true },
    }),
    prisma.stickerBorder.findFirst({
      where: { id: borderId, isActive: true },
      select: { imageUrl: true },
    }),
  ]);

  if (!character || character.status !== "COMPLETED" || !character.generatedImagePath) {
    return NextResponse.json(
      { error: "생성이 완료된 캐릭터만 사용할 수 있습니다." },
      { status: 400 },
    );
  }
  if (!border) {
    return NextResponse.json(
      { error: "선택한 테두리를 확인할 수 없습니다." },
      { status: 400 },
    );
  }

  try {
    const composed = await composeStickerPreviewImage({
      userId: session.user.id,
      characterImagePath: character.generatedImagePath,
      borderImageUrl: border.imageUrl,
      phrase,
      layout,
      cutoutImagePath,
      cutoutOnly: !bake,
    });
    return NextResponse.json({
      previewImagePath: bake ? composed.imagePath : null,
      cutoutImagePath: composed.cutoutImagePath,
      borderImageUrl: border.imageUrl,
      layout: composed.layout,
    });
  } catch (error) {
    console.error("[sticker-compose] failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "스티커 미리보기를 만들지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
