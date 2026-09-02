import { resolveArtStyleForOrder } from "@/lib/art-styles";
import { isComfyMockEnabled } from "@/lib/comfy-server";
import { logGenerationEvent } from "@/lib/generation-events";
import { buildIllustrationEditPrompt } from "@/lib/illustration-prompt";
import {
  generateIllustrationViaResponsesAPI,
  loadImageAsset,
} from "@/lib/openai-illustration";
import { prisma } from "@/lib/prisma";
import { markOrderPreviewGeneratedIfReady } from "@/lib/preview-status";
import { revalidateIllustrationWork } from "@/lib/revalidate-admin";
import {
  isStaleProcessing,
  staleProcessingBefore,
} from "@/lib/illustration-generation-policy";
import {
  ILLUSTRATION_OUTPUT_FORMAT,
  mimeForOutputFormat,
} from "@/lib/image-generation-config";
import { enqueueNextPendingIllustration } from "@/lib/enqueue-illustration-generation";
import { persistGeneratedIllustrationBuffer } from "@/lib/uploads";
import { toOpenAIRateLimitError } from "@/lib/openai-rate-limit";

// Prisma client must include Illustration.errorReason (regenerated after that column).
function illustrationErrorReason(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "unknown error";
  return message.slice(0, 1000);
}

export type IllustrationGenerateResult = {
  error?: string;
  success?: boolean;
  regenerated?: boolean;
};

export async function runIllustrationGeneration(options: {
  illustrationId: string;
  prompt: string;
  characterIds: string[];
  keepImage?: boolean;
  chainNext?: boolean;
  fromQueue?: boolean;
}): Promise<IllustrationGenerateResult> {
  const {
    illustrationId,
    prompt,
    characterIds,
    keepImage = false,
    chainNext = false,
    fromQueue = false,
  } = options;

  const illustration = await prisma.illustration.findUnique({
    where: { id: illustrationId },
    include: {
      order: {
        select: {
          id: true,
          userId: true,
          templateId: true,
          artStyleId: true,
          characterAsset: {
            select: {
              id: true,
              characterId: true,
              status: true,
              styledImageUrl: true,
            },
          },
        },
      },
    },
  });

  const userId = illustration?.order.userId;

  const logIllustration = (
    step: string,
    message: string,
    detail?: Record<string, unknown>,
  ) => {
    logGenerationEvent({
      kind: "ILLUSTRATION",
      entityId: illustrationId,
      orderId: illustration?.orderId,
      userId,
      step,
      message,
      detail: {
        pageNumber: illustration?.pageNumber,
        pageType: illustration?.pageType,
        ...detail,
      },
    });
  };

  if (!illustration) {
    return { error: "페이지를 찾을 수 없습니다." };
  }

  const orderId = illustration.orderId;
  const pageNumber = illustration.pageNumber;
  logIllustration("illustration.job_start", "삽화 생성 작업 시작");

  if (!prompt) {
    logIllustration("illustration.failed", "프롬프트 없음", { reason: "no_prompt" });
    return { error: "프롬프트를 입력해 주세요." };
  }

  if (characterIds.length < 1) {
    logIllustration("illustration.failed", "캐릭터 미선택", {
      reason: "no_characters",
    });
    return { error: "캐릭터를 한 명 이상 선택해 주세요." };
  }

  const linkedAsset = illustration.order.characterAsset;
  if (linkedAsset && linkedAsset.status !== "READY") {
    return { error: "캐릭터 그림체 변환이 아직 끝나지 않았습니다." };
  }

  const styledAsset =
    linkedAsset?.status === "READY" && linkedAsset.styledImageUrl
      ? linkedAsset
      : null;

  const characters = await prisma.character.findMany({
    where: { id: { in: characterIds } },
    select: { id: true, label: true, generatedImagePath: true },
  });
  const characterMap = new Map(
    characters.map((character) => [character.id, character]),
  );
  const selectedCharacters = characterIds
    .map((id) => characterMap.get(id))
    .filter(
      (
        character,
      ): character is {
        id: string;
        label: string;
        generatedImagePath: string | null;
      } => Boolean(character),
    )
    .slice(0, 3)
    .filter((character) => {
      if (styledAsset && character.id === styledAsset.characterId) {
        return Boolean(styledAsset.styledImageUrl);
      }
      return Boolean(character.generatedImagePath);
    });

  if (selectedCharacters.length < 1) {
    logIllustration("illustration.failed", "캐릭터 이미지 없음", {
      reason: "no_character_image",
    });
    return { error: "생성된 캐릭터 이미지가 없습니다." };
  }

  if (fromQueue && illustration.status === "COMPLETED" && !keepImage) {
    return { success: true, regenerated: false };
  }

  if (
    !fromQueue &&
    illustration.status === "PROCESSING" &&
    !isStaleProcessing(illustration.updatedAt)
  ) {
    logIllustration("illustration.skipped", "이미 생성 중", {
      status: illustration.status,
    });
    return { error: "이미 생성 중입니다." };
  }

  const characterImageUrls = selectedCharacters.map((character) => {
    if (
      styledAsset &&
      character.id === styledAsset.characterId &&
      styledAsset.styledImageUrl
    ) {
      return styledAsset.styledImageUrl;
    }
    return character.generatedImagePath as string;
  });

  const firstCharacterPath = characterImageUrls[0];
  if (!firstCharacterPath) {
    return { error: "생성된 캐릭터 이미지가 없습니다." };
  }

  async function chainFollowingPage() {
    if (!chainNext) {
      return;
    }
    try {
      await enqueueNextPendingIllustration(orderId, {
        afterPageNumber: pageNumber,
      });
    } catch (error) {
      console.error(
        "[illustration-generate] enqueue next page failed",
        orderId,
        error,
      );
    }
  }

  if (isComfyMockEnabled()) {
    await prisma.illustration.update({
      where: { id: illustrationId },
      data: {
        prompt,
        selectedCharacterIds: characterIds,
        status: "COMPLETED",
        progressPercent: 100,
        progressLabel: "로컬 목업",
        imagePath: keepImage
          ? illustration.imagePath ?? firstCharacterPath
          : firstCharacterPath,
        sceneImagePath: keepImage
          ? illustration.sceneImagePath ?? firstCharacterPath
          : firstCharacterPath,
      },
    });
    revalidateIllustrationWork(illustration.orderId);
    await markOrderPreviewGeneratedIfReady(illustration.orderId);
    console.log("[comfy mock] illustration completed locally", illustrationId);
    await chainFollowingPage();
    return { success: true, regenerated: keepImage };
  }

  let styleImageUrl: string | null = null;
  if (!styledAsset) {
    const artStyle = await resolveArtStyleForOrder({
      artStyleId: illustration.order.artStyleId,
      templateId: illustration.order.templateId,
    });
    if (!artStyle?.referenceImageUrl) {
      logIllustration("illustration.failed", "그림체 레퍼런스 없음", {
        reason: "no_art_style",
      });
      return { error: "그림 스타일 레퍼런스 이미지가 없습니다." };
    }
    styleImageUrl = artStyle.referenceImageUrl;
  }

  const claimed = await prisma.illustration.updateMany({
    where: fromQueue
      ? {
          id: illustrationId,
          status: keepImage
            ? { in: ["IDLE", "FAILED", "PROCESSING", "COMPLETED"] }
            : { in: ["IDLE", "FAILED", "PROCESSING"] },
        }
      : {
          id: illustrationId,
          OR: [
            { NOT: { status: "PROCESSING" } },
            { status: "PROCESSING", updatedAt: { lt: staleProcessingBefore() } },
          ],
        },
    data: {
      prompt,
      selectedCharacterIds: characterIds,
      status: "PROCESSING",
      progressPercent: 8,
      progressLabel: "이미지 생성 중",
      imagePath: keepImage ? illustration.imagePath : null,
      errorReason: null,
    },
  });

  if (claimed.count === 0) {
    logIllustration("illustration.skipped", "생성 슬롯 확보 실패 (중복 실행)", {
      status: illustration.status,
    });
    return { error: "이미 생성 중입니다." };
  }

  logIllustration("illustration.claimed", "PROCESSING 상태로 전환");

  const heartbeat = setInterval(() => {
    void prisma.illustration
      .update({
        where: { id: illustrationId },
        data: {
          // Touch updatedAt so status polling does not re-enqueue a live job.
          progressLabel: "이미지 생성 중",
        },
      })
      .catch((error) => {
        console.warn(
          "[illustration-generate] heartbeat failed",
          illustrationId,
          error,
        );
      });
  }, 20_000);

  try {
    const characterImages = await Promise.all(
      characterImageUrls.map((imageUrl) => loadImageAsset(imageUrl)),
    );

    logIllustration("illustration.assets_loaded", "캐릭터·그림체 이미지 로드 완료", {
      characterCount: characterImages.length,
      styledAsset: Boolean(styledAsset),
    });

    logIllustration("illustration.openai_request", "OpenAI 이미지 생성 요청", {
      characterCount: characterImages.length,
    });

    const openAiWaitLog = setInterval(() => {
      logIllustration("illustration.still_processing", "OpenAI 응답 대기 중");
    }, 45_000);

    let generated;
    try {
      generated = styledAsset
        ? await generateIllustrationViaResponsesAPI({
            prompt,
            characters: characterImages,
          })
        : await generateIllustrationViaResponsesAPI({
            prompt: buildIllustrationEditPrompt({
              sceneDescription: prompt,
              pageType: illustration.pageType === "COVER" ? "COVER" : "PAGE",
              character1Name: selectedCharacters[0]?.label ?? "",
              characterCount: characterImages.length,
            }),
            characters: characterImages,
            style: await loadImageAsset(styleImageUrl as string),
          });
    } finally {
      clearInterval(openAiWaitLog);
    }

    logIllustration("illustration.openai_done", "OpenAI 이미지 응답 수신", {
      elapsedMs: generated.elapsedMs,
      hasRevisedPrompt: Boolean(generated.revisedPrompt),
    });

    const imagePath = await persistGeneratedIllustrationBuffer(
      Buffer.from(generated.b64, "base64"),
      mimeForOutputFormat(ILLUSTRATION_OUTPUT_FORMAT),
    );

    logIllustration("illustration.upload_done", "이미지 저장 완료", {
      imagePath,
    });

    await prisma.illustration.update({
      where: { id: illustrationId },
      data: {
        status: "COMPLETED",
        imagePath,
        sceneImagePath: imagePath,
        progressPercent: 100,
        progressLabel: "완료",
        errorReason: null,
      },
    });
  } catch (error) {
    if (fromQueue && toOpenAIRateLimitError(error)) {
      throw error;
    }
    const errorReason = illustrationErrorReason(error);
    logIllustration("illustration.failed", "삽화 생성 실패", {
      error: errorReason,
    });
    console.error("illustration generation failed", error);
    await prisma.illustration.update({
      where: { id: illustrationId },
      data: {
        status: "FAILED",
        progressPercent: 0,
        progressLabel: null,
        errorReason,
      },
    });
    revalidateIllustrationWork(illustration.orderId);
    await markOrderPreviewGeneratedIfReady(illustration.orderId);
    await chainFollowingPage();
    return {
      error:
        error instanceof Error
          ? error.message
          : "삽화 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };
  } finally {
    clearInterval(heartbeat);
  }

  revalidateIllustrationWork(illustration.orderId);
  await markOrderPreviewGeneratedIfReady(illustration.orderId);
  logIllustration("illustration.completed", "삽화 생성 완료");
  await chainFollowingPage();
  return { success: true, regenerated: keepImage };
}
