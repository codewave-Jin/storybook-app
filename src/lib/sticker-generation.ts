import { isComfyMockEnabled } from "@/lib/comfy-server";
import {
  generateIllustrationViaResponsesAPI,
  loadImageAsset,
} from "@/lib/openai-illustration";
import { prisma } from "@/lib/prisma";
import { buildStickerPreviewPrompt } from "@/lib/sticker-prompt";
import { persistGeneratedStickerBuffer } from "@/lib/uploads";

async function markPreviewFailed(orderId: string, error: string) {
  await prisma.stickerOrder.update({
    where: { id: orderId },
    data: {
      previewStatus: "FAILED",
      errorReason: error,
    },
  });
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

  if (order.previewImagePath || order.previewStatus === "COMPLETED") {
    return { success: true, skipped: true };
  }

  const claimed = await prisma.stickerOrder.updateMany({
    where: {
      id: orderId,
      previewImagePath: null,
      previewStatus: { in: ["IDLE", "FAILED"] },
    },
    data: {
      previewStatus: "PROCESSING",
      errorReason: null,
    },
  });

  if (claimed.count === 0) {
    if (order.previewStatus === "PROCESSING") {
      return { success: true, skipped: true };
    }
    return { error: "스티커 생성을 시작할 수 없습니다." };
  }

  const fail = async (error: string) => {
    await markPreviewFailed(orderId, error);
    return { error };
  };

  const characterImage =
    order.character.generatedImagePath ?? order.character.originalPhotoPath;
  if (!characterImage) {
    return fail("캐릭터 이미지가 없습니다.");
  }

  const customCostumeHint = order.customCostumeHint.trim();
  const costumeHint = customCostumeHint || (order.costume?.promptHint?.trim() ?? "");
  if (!customCostumeHint && !order.costume) {
    return fail("선택한 코스튬을 확인할 수 없습니다.");
  }

  const designUrl = order.template.designReferenceImageUrl?.trim() || null;
  if (!designUrl) {
    return fail("템플릿 레퍼런스 이미지가 없습니다.");
  }

  if (isComfyMockEnabled()) {
    await prisma.stickerOrder.update({
      where: { id: orderId },
      data: {
        previewImagePath: characterImage,
        previewStatus: "COMPLETED",
        errorReason: null,
      },
    });
    return { success: true, mock: true };
  }

  try {
    const characterAsset = await loadImageAsset(characterImage);
    const styleAsset = await loadImageAsset(designUrl);

    const generated = await generateIllustrationViaResponsesAPI({
      prompt: buildStickerPreviewPrompt({
        phrase: order.phrase,
        costumeHint,
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
        previewStatus: "COMPLETED",
        errorReason: null,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("[sticker-generation] preview failed", orderId, error);
    const message =
      error instanceof Error ? error.message : "스티커 생성에 실패했습니다.";
    return fail(message);
  }
}
