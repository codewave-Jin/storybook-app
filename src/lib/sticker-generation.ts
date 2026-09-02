import { isComfyMockEnabled } from "@/lib/comfy-server";
import { logGenerationEvent } from "@/lib/generation-events";
import {
  generateIllustrationViaResponsesAPI,
  loadImageAsset,
} from "@/lib/openai-illustration";
import { mimeForOutputFormat, STICKER_OUTPUT_FORMAT } from "@/lib/image-generation-config";
import { prisma } from "@/lib/prisma";
import { buildStickerPreviewPrompt } from "@/lib/sticker-prompt";
import { shouldReclaimStickerProcessing } from "@/lib/sticker-generation-policy";
import { persistGeneratedStickerBuffer } from "@/lib/uploads";
import { toOpenAIRateLimitError } from "@/lib/openai-rate-limit";

async function markPreviewFailed(orderId: string, error: string) {
  await prisma.stickerOrder.update({
    where: { id: orderId },
    data: {
      previewStatus: "FAILED",
      errorReason: error,
    },
  });
}

export async function runStickerPreviewGeneration(
  orderId: string,
  options?: { fromQueue?: boolean },
) {
  const fromQueue = options?.fromQueue === true;
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

  const logSticker = (
    step: string,
    message: string,
    detail?: Record<string, unknown>,
  ) => {
    logGenerationEvent({
      kind: "STICKER",
      entityId: orderId,
      orderId,
      userId: order.userId,
      step,
      message,
      detail,
    });
  };

  logSticker("sticker.job_start", "스티커 미리보기 생성 시작");

  if (order.previewImagePath || order.previewStatus === "COMPLETED") {
    logSticker("sticker.skipped", "이미 미리보기 있음");
    return { success: true, skipped: true };
  }

  const claimed = await prisma.stickerOrder.updateMany({
    where: {
      id: orderId,
      previewImagePath: null,
      OR: fromQueue
        ? [{ previewStatus: { in: ["IDLE", "FAILED", "PROCESSING"] } }]
        : [
            { previewStatus: { in: ["IDLE", "FAILED"] } },
            {
              previewStatus: "PROCESSING",
              createdAt: {
                lt: new Date(Date.now() - 75_000),
              },
            },
          ],
    },
    data: {
      previewStatus: "PROCESSING",
      errorReason: null,
    },
  });

  if (claimed.count === 0) {
    if (
      !fromQueue &&
      order.previewStatus === "PROCESSING" &&
      !shouldReclaimStickerProcessing(order)
    ) {
      logSticker("sticker.skipped", "이미 생성 중");
      return { success: true, skipped: true };
    }
    if (order.previewStatus === "COMPLETED" || order.previewImagePath) {
      return { success: true, skipped: true };
    }
    logSticker("sticker.failed", "생성 슬롯 확보 실패");
    return { error: "스티커 생성을 시작할 수 없습니다." };
  }

  logSticker("sticker.claimed", "PROCESSING 상태로 전환");

  const fail = async (error: string) => {
    logSticker("sticker.failed", error, { reason: error });
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
    logSticker("sticker.completed", "목업으로 완료");
    return { success: true, mock: true };
  }

  try {
    const characterAsset = await loadImageAsset(characterImage);
    const styleAsset = await loadImageAsset(designUrl);
    logSticker("sticker.assets_loaded", "캐릭터·디자인 이미지 로드 완료");

    logSticker("sticker.openai_request", "OpenAI 이미지 생성 요청");
    const openAiWaitLog = setInterval(() => {
      logSticker("sticker.still_processing", "OpenAI 응답 대기 중");
    }, 45_000);

    let generated;
    try {
      generated = await generateIllustrationViaResponsesAPI({
        prompt: buildStickerPreviewPrompt({
          phrase: order.phrase,
          costumeHint,
        }),
        characters: [characterAsset],
        style: styleAsset,
        outputFormat: STICKER_OUTPUT_FORMAT,
      });
    } finally {
      clearInterval(openAiWaitLog);
    }
    logSticker("sticker.openai_done", "OpenAI 이미지 응답 수신", {
      elapsedMs: generated.elapsedMs,
    });

    const imagePath = await persistGeneratedStickerBuffer(
      Buffer.from(generated.b64, "base64"),
      mimeForOutputFormat(STICKER_OUTPUT_FORMAT),
    );
    logSticker("sticker.upload_done", "이미지 저장 완료", { imagePath });

    await prisma.stickerOrder.update({
      where: { id: orderId },
      data: {
        previewImagePath: imagePath,
        previewStatus: "COMPLETED",
        errorReason: null,
      },
    });
    logSticker("sticker.completed", "스티커 미리보기 완료");
    return { success: true };
  } catch (error) {
    if (fromQueue && toOpenAIRateLimitError(error)) {
      throw error;
    }
    console.error("[sticker-generation] preview failed", orderId, error);
    const message =
      error instanceof Error ? error.message : "스티커 생성에 실패했습니다.";
    return fail(message);
  }
}
