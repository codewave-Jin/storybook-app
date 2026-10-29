import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseEmoticonAgeInput } from "@/lib/emoticon-prompt";
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
  buildPhotoSpecialStickerPrompt,
  buildSpecialStickerPrompt,
  parseSpecialGenerateBody,
  specialGeneratePhrase,
  specialGenerateTopic,
  specialGenderLabel,
  specialStickerCostumeHint,
} from "@/lib/sticker-special";
import { consumeTokenHold, getCharacterSlotAndTokens, refundTokenHold } from "@/lib/tokens";
import { persistGeneratedStickerBuffer, toAbsolutePublicPath } from "@/lib/uploads";

export const maxDuration = 180;

const PHOTO_MAX_BYTES = 6 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function photoMime(file: File) {
  if (PHOTO_TYPES.has(file.type)) {
    return file.type;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

function readPhotoAge(body: unknown) {
  if (!body || typeof body !== "object") {
    return { age: null, ageUnit: null };
  }
  const data = body as { age?: unknown; ageUnit?: unknown };
  if (data.age == null || data.age === "") {
    return { age: null, ageUnit: null };
  }
  return parseEmoticonAgeInput(
    typeof data.age === "number" ? String(data.age) : data.age,
    data.ageUnit,
  );
}

async function readGenerateRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return {
      body: (await request.json().catch(() => null)) as unknown,
      photo: null as { bytes: Buffer; mime: string } | null,
    };
  }

  const form = await request.formData();
  const payloadRaw = form.get("payload");
  if (typeof payloadRaw !== "string") {
    return { error: "생성 정보를 확인해 주세요." };
  }
  let body: unknown;
  try {
    body = JSON.parse(payloadRaw);
  } catch {
    return { error: "생성 정보를 확인해 주세요." };
  }
  const image = form.get("image");
  if (!(image instanceof File) || image.size <= 0) {
    return { error: "실제 사진을 올려 주세요." };
  }
  const mime = photoMime(image);
  if (!mime) {
    return { error: "jpg, png, webp 사진만 올릴 수 있습니다." };
  }
  if (image.size > PHOTO_MAX_BYTES) {
    return { error: "사진은 6MB 이하로 올려 주세요." };
  }
  return {
    body,
    photo: {
      bytes: Buffer.from(await image.arrayBuffer()),
      mime,
    },
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const userId = session.user.id;
  const incoming = await readGenerateRequest(request);
  if ("error" in incoming) {
    return NextResponse.json({ error: incoming.error }, { status: 400 });
  }
  const body = incoming.body as { characterId?: unknown } | null;
  const photo = incoming.photo;
  const characterId =
    typeof body?.characterId === "string" ? body.characterId.trim() : "";
  const parsed = parseSpecialGenerateBody(body);

  if (!photo && !characterId) {
    return NextResponse.json({ error: "캐릭터를 선택해 주세요." }, { status: 400 });
  }
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const photoAge = photo ? readPhotoAge(body) : { age: null, ageUnit: null };
  if ("error" in photoAge) {
    return NextResponse.json({ error: photoAge.error }, { status: 400 });
  }

  let sourceImage: { bytes: Buffer; mime: string } | null = photo;
  let characterGender: string | null = null;
  if (!photo) {
    const character = await prisma.character.findFirst({
      where: { id: characterId, userId, deletedAt: null },
      select: { generatedImagePath: true, status: true, gender: true },
    });
    if (!character || character.status !== "COMPLETED" || !character.generatedImagePath) {
      return NextResponse.json(
        { error: "생성이 완료된 캐릭터만 사용할 수 있습니다." },
        { status: 400 },
      );
    }
    sourceImage = await loadImageAsset(character.generatedImagePath);
    characterGender = character.gender;
  }

  let companionImage: { bytes: Buffer; mime: string } | null = null;
  let companionGenderLabel: string | undefined;
  const companionId = photo ? null : parsed.companionCharacterId;
  if (companionId) {
    if (companionId === characterId) {
      return NextResponse.json(
        { error: "함께 나올 다른 캐릭터를 골라 주세요." },
        { status: 400 },
      );
    }
    const companion = await prisma.character.findFirst({
      where: { id: companionId, userId, deletedAt: null },
      select: { generatedImagePath: true, status: true, gender: true },
    });
    if (!companion || companion.status !== "COMPLETED" || !companion.generatedImagePath) {
      return NextResponse.json(
        { error: "생성이 완료된 캐릭터만 함께 사용할 수 있습니다." },
        { status: 400 },
      );
    }
    companionImage = await loadImageAsset(companion.generatedImagePath);
    companionGenderLabel = specialGenderLabel(companion.gender);
  }

  const topic = specialGenerateTopic(parsed);
  const phrase = specialGeneratePhrase(parsed);
  const primaryGenderLabel =
    parsed.kind === "nametag"
      ? specialGenderLabel(parsed.gender)
      : specialGenderLabel(characterGender as "FEMALE" | "MALE" | null);
  const twoCharacters = Boolean(companionId);
  const genderLabel = twoCharacters
    ? `첫 번째 ${primaryGenderLabel ?? ""}, 두 번째 ${companionGenderLabel ?? ""}`.trim()
    : primaryGenderLabel;
  const promptCharacters = [
    {
      genderLabel: primaryGenderLabel ?? "",
      outfit: parsed.outfits[0] ?? "",
    },
    ...(twoCharacters
      ? [
          {
            genderLabel: companionGenderLabel ?? "",
            outfit: parsed.outfits[1] ?? "",
          },
        ]
      : []),
  ];
  const prompt = photo
    ? buildPhotoSpecialStickerPrompt({
        kind: parsed.kind,
        topic,
        phrase,
        genderLabel: primaryGenderLabel,
        outfits: parsed.outfits,
        age: photoAge.age,
        ageUnit: photoAge.ageUnit,
      })
    : buildSpecialStickerPrompt({
        kind: parsed.kind,
        topic,
        phrase,
        genderLabel,
        twins: twoCharacters,
        outfits: parsed.outfits,
        characters: promptCharacters,
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

    if (characterId) {
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
    }

    if (!sourceImage) {
      throw new Error("입력 이미지를 찾지 못했습니다.");
    }
    const keepStickerDesign = parsed.kind === "gift";
    const generated = await generateStickerImage({
      prompt,
      imageBytes: sourceImage.bytes,
      imageMime: sourceImage.mime,
      extraImages: companionImage
        ? [{ imageBytes: companionImage.bytes, imageMime: companionImage.mime }]
        : undefined,
      outputFormat: "png",
      background: keepStickerDesign ? "opaque" : "transparent",
    });
    const rawBytes = Buffer.from(generated.b64, "base64");
    let imageBytes = rawBytes;
    if (!keepStickerDesign && !(await imageHasTransparency(rawBytes))) {
      const rawPath = await persistGeneratedStickerBuffer(
        rawBytes,
        mimeForOutputFormat("png"),
        userId,
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
      userId,
    );
    if (orderId) {
      await completeStickerDraftPreview(orderId, imagePath);
    }
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
