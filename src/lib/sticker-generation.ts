import { isComfyMockEnabled } from "@/lib/comfy-server";
import {
  generateIllustrationViaResponsesAPI,
  loadImageAsset,
} from "@/lib/openai-illustration";
import { prisma } from "@/lib/prisma";
import { persistGeneratedStickerBuffer } from "@/lib/uploads";

function buildStickerPrompt(input: {
  phrase: string;
  costumeHint: string;
  hasDesign: boolean;
}) {
  return [
    "Image roles:",
    "- The first image is the character reference.",
    input.hasDesign
      ? "- The second image is the sticker frame/design reference."
      : "- If a second image is present, treat it as extra character reference.",
    "",
    "Character identity (first image):",
    "Keep the same child as the reference. Copy face, hairstyle, hair color, and skin tone closely.",
    "Clothing follows the costume instruction below.",
    "",
    "Costume:",
    input.costumeHint.trim() || "Keep the character in their original outfit.",
    "",
    input.hasDesign
      ? `Frame / design: match the second image's decorative frame. Replace any text with exactly '${input.phrase}'. Keep a clean circular sticker border. Outside the circle must be plain white.`
      : `Create a circular die-cut sticker of this character with the phrase '${input.phrase}' on the design. Plain white background outside the circle.`,
    "",
    "Output: gentle child-friendly sticker illustration, isolated, no shadows.",
  ].join("\n");
}

export async function runStickerPreviewGeneration(orderId: string) {
  const order = await prisma.stickerOrder.findUnique({
    where: { id: orderId },
    include: {
      character: {
        select: {
          generatedImagePath: true,
          originalPhotoPath: true,
        },
      },
      template: {
        select: {
          promptModifier: true,
          designReferenceImageUrl: true,
        },
      },
      costume: {
        select: { promptHint: true },
      },
    },
  });

  if (!order) {
    return { error: "스티커 주문을 찾을 수 없습니다." };
  }

  if (order.previewImagePath) {
    return { success: true, skipped: true };
  }

  const characterImage =
    order.character.generatedImagePath ?? order.character.originalPhotoPath;
  if (!characterImage) {
    return { error: "캐릭터 이미지가 없습니다." };
  }

  const claimed = await prisma.stickerOrder.updateMany({
    where: {
      id: orderId,
      previewImagePath: null,
      productionStatus: { in: ["WAITING", "ILLUSTRATING"] },
    },
    data: { productionStatus: "ILLUSTRATING" },
  });

  if (claimed.count === 0 && order.productionStatus === "ILLUSTRATING") {
    return { success: true, skipped: true };
  }

  if (isComfyMockEnabled()) {
    await prisma.stickerOrder.update({
      where: { id: orderId },
      data: {
        previewImagePath: characterImage,
        productionStatus: "WAITING",
      },
    });
    return { success: true, mock: true };
  }

  try {
    const costumeHint =
      order.costume?.promptHint?.trim() ||
      order.template.promptModifier.trim() ||
      "Keep the character in their original outfit";
    const designUrl = order.template.designReferenceImageUrl?.trim() || null;
    const characterAsset = await loadImageAsset(characterImage);
    const styleAsset = designUrl
      ? await loadImageAsset(designUrl)
      : characterAsset;

    const generated = await generateIllustrationViaResponsesAPI({
      prompt: buildStickerPrompt({
        phrase: order.phrase,
        costumeHint,
        hasDesign: Boolean(designUrl),
      }),
      characters: [characterAsset],
      style: styleAsset,
    });

    const imagePath = await persistGeneratedStickerBuffer(
      Buffer.from(generated.b64, "base64"),
    );

    await prisma.stickerOrder.update({
      where: { id: orderId },
      data: {
        previewImagePath: imagePath,
        productionStatus: "WAITING",
      },
    });
    return { success: true };
  } catch (error) {
    console.error("[sticker-generation] preview failed", orderId, error);
    await prisma.stickerOrder.update({
      where: { id: orderId },
      data: {
        previewImagePath: characterImage,
        productionStatus: "WAITING",
      },
    });
    return {
      error:
        error instanceof Error ? error.message : "스티커 생성에 실패했습니다.",
    };
  }
}
