import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mimeForOutputFormat } from "@/lib/image-generation-config";
import { loadImageAsset } from "@/lib/openai-illustration";
import { prisma } from "@/lib/prisma";
import { generateStickerImage } from "@/lib/sticker-openai";
import {
  clearStickerCharacterBackground,
  imageHasTransparency,
} from "@/lib/sticker-cutout";
import {
  completeStickerDraftPreview,
  createInProgressStickerDraft,
  deleteUnpaidStickerDraft,
} from "@/lib/sticker-draft";
import {
  SPECIAL_GENDER_OPTIONS,
  buildSpecialStickerPrompt,
  parseSpecialGenerateBody,
  specialGeneratePhrase,
  specialGenerateTopic,
  specialStickerCostumeHint,
} from "@/lib/sticker-special";
import { consumeTokenHold, getCharacterSlotAndTokens, refundTokenHold } from "@/lib/tokens";
import { persistGeneratedStickerBuffer, toAbsolutePublicPath } from "@/lib/uploads";

export const maxDuration = 180;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const userId = session.user.id;
  const body = (await request.json().catch(() => null)) as {
    characterId?: unknown;
  } | null;
  const characterId =
    typeof body?.characterId === "string" ? body.characterId.trim() : "";
  const parsed = parseSpecialGenerateBody(body);

  if (!characterId) {
    return NextResponse.json({ error: "캐릭터를 선택해 주세요." }, { status: 400 });
  }
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const character = await prisma.character.findFirst({
    where: { id: characterId, userId },
    select: { generatedImagePath: true, status: true },
  });
  if (!character || character.status !== "COMPLETED" || !character.generatedImagePath) {
    return NextResponse.json(
      { error: "생성이 완료된 캐릭터만 사용할 수 있습니다." },
      { status: 400 },
    );
  }

  const topic = specialGenerateTopic(parsed);
  const phrase = specialGeneratePhrase(parsed);
  const genderLabel =
    parsed.kind === "nametag"
      ? SPECIAL_GENDER_OPTIONS.find((item) => item.key === parsed.gender)?.label
      : undefined;
  const prompt = buildSpecialStickerPrompt({
    kind: parsed.kind,
    topic,
    phrase,
    genderLabel,
  });

  let holdId: string | null = null;
  let orderId: string | null = null;
  try {
    const consumed = await consumeTokenHold(userId, "STICKER_SPECIAL");
    if (!consumed.success || !consumed.holdId) {
      return NextResponse.json(
        { error: consumed.message ?? "토큰이 부족합니다" },
        { status: 400 },
      );
    }
    holdId = consumed.holdId;

    const draft = await createInProgressStickerDraft({
      userId,
      characterId,
      phrase,
      customCostumeHint: specialStickerCostumeHint(parsed),
      holdId,
    });
    if ("error" in draft) {
      await refundTokenHold(userId, holdId);
      return NextResponse.json({ error: draft.error }, { status: 400 });
    }
    orderId = draft.orderId;

    const image = await loadImageAsset(character.generatedImagePath);
    const generated = await generateStickerImage({
      prompt,
      imageBytes: image.bytes,
      imageMime: image.mime,
      outputFormat: "png",
      background: "transparent",
    });
    const rawBytes = Buffer.from(generated.b64, "base64");
    let imageBytes = rawBytes;
    if (!(await imageHasTransparency(rawBytes))) {
      const rawPath = await persistGeneratedStickerBuffer(
        rawBytes,
        mimeForOutputFormat("png"),
      );
      imageBytes = Buffer.from(
        await clearStickerCharacterBackground(
          toAbsolutePublicPath(rawPath),
          rawBytes,
        ),
      );
    }
    const imagePath = await persistGeneratedStickerBuffer(
      imageBytes,
      mimeForOutputFormat("png"),
    );
    await completeStickerDraftPreview(orderId, imagePath);
    const { tokens } = await getCharacterSlotAndTokens(userId);
    return NextResponse.json({
      imagePath,
      tokens,
      holdId,
      orderId,
    });
  } catch (error) {
    if (orderId) {
      await deleteUnpaidStickerDraft(userId, orderId);
    } else if (holdId) {
      await refundTokenHold(userId, holdId);
    }
    console.error("[sticker-special] generate failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지를 만들지 못했습니다. 다시 시도해 주세요.",
      },
      { status: 500 },
    );
  }
}
