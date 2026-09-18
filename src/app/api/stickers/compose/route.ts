import { writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { composeStickerPreviewImage } from "@/lib/sticker-compose";
import {
  parseStickerLayout,
  type StickerLayoutState,
} from "@/lib/sticker-layout-constants";
import { prisma } from "@/lib/prisma";
import {
  parseStickerPhrase,
  stickerPhraseValidationError,
} from "@/lib/sticker-phrase";

export const maxDuration = 180;

const STICKER_LAYOUT_SAMPLE_PATH = path.join(
  process.cwd(),
  "sticker-layout-sample.json",
);

async function persistStickerLayoutSample(layout: StickerLayoutState) {
  if (process.env.VERCEL === "1") {
    return;
  }
  try {
    await writeFile(
      STICKER_LAYOUT_SAMPLE_PATH,
      `${JSON.stringify(layout, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    console.warn("[sticker-compose] layout sample not saved", error);
  }
}

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

  const phraseError = stickerPhraseValidationError(parts, { required: false });
  if (!characterId || !borderId || phraseError) {
    return NextResponse.json(
      { error: phraseError ?? "캐릭터와 테두리를 확인해 주세요." },
      { status: 400 },
    );
  }

  const [character, border] = await Promise.all([
    prisma.character.findFirst({
      where: { id: characterId, userId: session.user.id, deletedAt: null },
      select: { generatedImagePath: true, status: true },
    }),
    prisma.stickerBorder.findFirst({
      where: { id: borderId, isActive: true },
      select: { imageUrl: true, category: true, key: true },
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
      transparentCanvas: border.category === "NONE" || border.key === "none",
    });
    if (bake) {
      await persistStickerLayoutSample(composed.layout);
    }
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
