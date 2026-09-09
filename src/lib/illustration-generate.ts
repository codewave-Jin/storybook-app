import { artStyleSkipsStyleTransfer, resolveArtStyleForOrder } from "@/lib/art-styles";
import { isComfyMockEnabled } from "@/lib/comfy-server";
import { logGenerationEvent } from "@/lib/generation-events";
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
  illustrationSizeForPageType,
  mimeForOutputFormat,
} from "@/lib/image-generation-config";
import { enqueuePendingIllustrations } from "@/lib/enqueue-illustration-generation";
import { persistGeneratedIllustrationBuffer } from "@/lib/uploads";
import { toOpenAIRateLimitError } from "@/lib/openai-rate-limit";
import { findReadyStyledCharacterAssets } from "@/lib/order-character-asset";
import { parseIdList } from "@/lib/orders";
import { buildFaceIdentityImageRoles, buildSceneStyleReferenceRole, artStyleSceneHint } from "@/lib/storybook-prompts";

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

async function resolveInBookStyleReference(options: {
  orderId: string;
  excludeIllustrationId: string;
  selectedCharacterIds: unknown;
}): Promise<string | null> {
  const completed = await prisma.illustration.findMany({
    where: {
      orderId: options.orderId,
      id: { not: options.excludeIllustrationId },
      status: "COMPLETED",
    },
    orderBy: { pageNumber: "asc" },
    select: {
      pageType: true,
      imagePath: true,
      sceneImagePath: true,
    },
  });
  const withImage = completed.filter(
    (page) => page.imagePath || page.sceneImagePath,
  );
  const cover =
    withImage.find((page) => page.pageType === "COVER") ?? withImage[0];
  const fromBook = cover?.imagePath?.trim() || cover?.sceneImagePath?.trim();
  if (fromBook) {
    return fromBook;
  }

  const heroId = parseIdList(options.selectedCharacterIds)[0];
  if (!heroId) {
    return null;
  }
  const hero = await prisma.character.findUnique({
    where: { id: heroId },
    select: { generatedImagePath: true },
  });
  return hero?.generatedImagePath?.trim() || null;
}

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
          selectedCharacterIds: true,
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

  const noPeople = characterIds.length < 1;
  const skipStyleTransfer = await artStyleSkipsStyleTransfer(
    illustration.order.artStyleId,
  );

  const styledByCharacterId =
    illustration.order.artStyleId && !noPeople && !skipStyleTransfer
      ? await findReadyStyledCharacterAssets(
          characterIds,
          illustration.order.artStyleId,
        )
      : new Map();

  const characters = noPeople
    ? []
    : await prisma.character.findMany({
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
      if (skipStyleTransfer) {
        return Boolean(character.generatedImagePath);
      }
      const styledUrl = styledByCharacterId.get(character.id)?.styledImageUrl;
      return Boolean(styledUrl || character.generatedImagePath);
    });

  if (!noPeople && selectedCharacters.length < 1) {
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

  if (!noPeople && illustration.order.artStyleId && !skipStyleTransfer) {
    const missingStyled = selectedCharacters.filter(
      (character) => !styledByCharacterId.get(character.id)?.styledImageUrl,
    );
    if (missingStyled.length > 0) {
      return { error: "캐릭터 그림체 변환이 아직 끝나지 않았습니다." };
    }
  }

  const styledAsset =
    skipStyleTransfer
      ? !noPeople && selectedCharacters.length > 0
      : !noPeople &&
        selectedCharacters.length > 0 &&
        selectedCharacters.every((character) =>
          Boolean(styledByCharacterId.get(character.id)?.styledImageUrl),
        );

  const characterRefs = selectedCharacters.map((character) => {
    const originalUrl = character.generatedImagePath?.trim() || null;
    if (skipStyleTransfer) {
      return {
        label: character.label,
        styledUrl: originalUrl,
        identityUrl: null as string | null,
      };
    }
    const styledUrl =
      styledByCharacterId.get(character.id)?.styledImageUrl?.trim() ||
      originalUrl;
    const identityUrl =
      originalUrl && styledUrl && originalUrl !== styledUrl
        ? originalUrl
        : null;
    return { label: character.label, styledUrl, identityUrl };
  });

  const characterImageUrls = characterRefs.flatMap((ref) => {
    const urls: string[] = [];
    if (ref.styledUrl) {
      urls.push(ref.styledUrl);
    }
    if (ref.identityUrl) {
      urls.push(ref.identityUrl);
    }
    return urls;
  });

  const identityRolePrompt = skipStyleTransfer
    ? ""
    : buildFaceIdentityImageRoles(
        characterRefs.map((ref) => ({
          label: ref.label,
          hasIdentity: Boolean(ref.identityUrl),
        })),
      );
  const generationPrompt = identityRolePrompt
    ? `${identityRolePrompt}\n\n${prompt}`
    : prompt;

  const firstCharacterPath = characterImageUrls[0] ?? null;
  if (!noPeople && !firstCharacterPath) {
    return { error: "생성된 캐릭터 이미지가 없습니다." };
  }

  async function chainFollowingPage() {
    if (!chainNext) {
      return;
    }
    try {
      await enqueuePendingIllustrations(orderId, {
        afterPageNumber: pageNumber,
        limit: 1,
        chainNext: true,
      });
    } catch (error) {
      console.error(
        "[illustration-generate] enqueue next page failed",
        orderId,
        error,
      );
    }
  }

  let styleImageUrl: string | null = null;
  let sceneStyle: { key: string; label: string } | null = null;
  if (skipStyleTransfer) {
    if (noPeople) {
      styleImageUrl = await resolveInBookStyleReference({
        orderId,
        excludeIllustrationId: illustrationId,
        selectedCharacterIds: illustration.order.selectedCharacterIds,
      });
      if (!styleImageUrl) {
        logIllustration("illustration.failed", "같은 책 그림체 레퍼런스 없음", {
          reason: "no_in_book_style",
        });
        return { error: "같은 책의 그림체 레퍼런스가 없습니다." };
      }
    }
  } else {
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
    sceneStyle = { key: artStyle.key, label: artStyle.label };
  }

  const styleRolePrompt =
    sceneStyle && styleImageUrl
      ? [
          buildSceneStyleReferenceRole({
            imageIndex: characterImageUrls.length + 1,
            styleLabel: sceneStyle.label,
            styleKey: sceneStyle.key,
          }),
          sceneStyle.key !== "watercolor"
            ? "일반적인 수채화 그림책 스타일로 바꾸지 마세요."
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : skipStyleTransfer
        ? artStyleSceneHint("basic")
        : "";
  const apiPrompt = [
    skipStyleTransfer && noPeople && styleImageUrl
      ? [
          "입력 이미지는 이 책의 그림체 레퍼런스입니다.",
          "선, 채색, 질감, 색감을 이 이미지와 같게 유지하세요.",
          "사람을 그리지 마세요.",
          "",
        ].join("\n")
      : "",
    generationPrompt,
    styleRolePrompt ? `\n\n${styleRolePrompt}` : "",
  ]
    .filter(Boolean)
    .join("");

  const mockImagePath = firstCharacterPath ?? styleImageUrl;
  if (!mockImagePath) {
    return { error: "그림 스타일 레퍼런스 이미지가 없습니다." };
  }

  if (isComfyMockEnabled()) {
    const mockPath =
      mockImagePath ??
      (
        await resolveArtStyleForOrder({
          artStyleId: illustration.order.artStyleId,
          templateId: illustration.order.templateId,
        })
      )?.referenceImageUrl;
    if (!mockPath) {
      return { error: "그림 스타일 레퍼런스 이미지가 없습니다." };
    }
    await prisma.illustration.update({
      where: { id: illustrationId },
      data: {
        prompt,
        selectedCharacterIds: characterIds,
        status: "COMPLETED",
        progressPercent: 100,
        progressLabel: "로컬 목업",
        imagePath: keepImage ? illustration.imagePath ?? mockPath : mockPath,
        sceneImagePath: keepImage
          ? illustration.sceneImagePath ?? mockPath
          : mockPath,
      },
    });
    revalidateIllustrationWork(illustration.orderId);
    await markOrderPreviewGeneratedIfReady(illustration.orderId);
    console.log("[comfy mock] illustration completed locally", illustrationId);
    await chainFollowingPage();
    return { success: true, regenerated: keepImage };
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
      characterCount: selectedCharacters.length,
      referenceImageCount: characterImages.length,
      styledAsset: Boolean(styledAsset),
      skipStyleTransfer,
      identityAnchored: Boolean(identityRolePrompt),
      inBookStyle: Boolean(skipStyleTransfer && noPeople && styleImageUrl),
      sceneStyleKey: sceneStyle?.key ?? null,
    });

    logIllustration("illustration.openai_request", "OpenAI 이미지 생성 요청", {
      characterCount: characterImages.length,
    });

    const openAiWaitLog = setInterval(() => {
      logIllustration("illustration.still_processing", "OpenAI 응답 대기 중");
    }, 45_000);

    const imageSize = illustrationSizeForPageType(illustration.pageType);

    let generated;
    try {
      generated = await generateIllustrationViaResponsesAPI({
        prompt: apiPrompt,
        characters: characterImages,
        style: styleImageUrl
          ? await loadImageAsset(styleImageUrl)
          : undefined,
        size: imageSize,
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
