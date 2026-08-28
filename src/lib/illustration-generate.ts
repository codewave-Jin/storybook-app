import { resolveArtStyleForOrder } from "@/lib/art-styles";
import { isComfyMockEnabled } from "@/lib/comfy-server";
import { buildIllustrationEditPrompt } from "@/lib/illustration-prompt";
import {
  generateIllustrationViaResponsesAPI,
  loadImageAsset,
} from "@/lib/openai-illustration";
import { prisma } from "@/lib/prisma";
import { markOrderPreviewGeneratedIfReady } from "@/lib/preview-status";
import { revalidateIllustrationWork } from "@/lib/revalidate-admin";
import { persistGeneratedIllustrationBuffer } from "@/lib/uploads";

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
}): Promise<IllustrationGenerateResult> {
  const { illustrationId, prompt, characterIds, keepImage = false } = options;

  const illustration = await prisma.illustration.findUnique({
    where: { id: illustrationId },
    include: {
      order: {
        select: {
          id: true,
          templateId: true,
          artStyleId: true,
        },
      },
    },
  });

  if (!illustration) {
    return { error: "페이지를 찾을 수 없습니다." };
  }

  if (!prompt) {
    return { error: "프롬프트를 입력해 주세요." };
  }

  if (characterIds.length < 1) {
    return { error: "캐릭터를 한 명 이상 선택해 주세요." };
  }

  const characters = await prisma.character.findMany({
    where: { id: { in: characterIds } },
    select: { id: true, generatedImagePath: true },
  });
  const characterMap = new Map(
    characters.map((character) => [character.id, character]),
  );
  const selectedCharacters = characterIds
    .map((id) => characterMap.get(id))
    .filter(
      (
        character,
      ): character is { id: string; generatedImagePath: string | null } =>
        Boolean(character?.generatedImagePath),
    )
    .slice(0, 3);

  if (selectedCharacters.length < 1) {
    return { error: "생성된 캐릭터 이미지가 없습니다." };
  }

  if (illustration.status === "PROCESSING") {
    return { error: "이미 생성 중입니다." };
  }

  const firstCharacterPath = selectedCharacters[0]?.generatedImagePath;
  if (!firstCharacterPath) {
    return { error: "생성된 캐릭터 이미지가 없습니다." };
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
    return { success: true, regenerated: keepImage };
  }

  const artStyle = await resolveArtStyleForOrder({
    artStyleId: illustration.order.artStyleId,
    templateId: illustration.order.templateId,
  });
  if (!artStyle?.referenceImageUrl) {
    return { error: "그림 스타일 레퍼런스 이미지가 없습니다." };
  }

  const claimed = await prisma.illustration.updateMany({
    where: {
      id: illustrationId,
      NOT: { status: "PROCESSING" },
    },
    data: {
      prompt,
      selectedCharacterIds: characterIds,
      status: "PROCESSING",
      progressPercent: 8,
      progressLabel: "이미지 생성 중",
      imagePath: keepImage ? illustration.imagePath : null,
    },
  });

  if (claimed.count === 0) {
    return { error: "이미 생성 중입니다." };
  }

  try {
    const [characterImages, styleImage] = await Promise.all([
      Promise.all(
        selectedCharacters.map((character) =>
          loadImageAsset(character.generatedImagePath as string),
        ),
      ),
      loadImageAsset(artStyle.referenceImageUrl),
    ]);

    const fullPrompt = buildIllustrationEditPrompt({
      sceneDescription: prompt,
      characterCount: characterImages.length,
    });

    const generated = await generateIllustrationViaResponsesAPI({
      prompt: fullPrompt,
      characters: characterImages,
      style: styleImage,
    });

    const imagePath = await persistGeneratedIllustrationBuffer(
      Buffer.from(generated.b64, "base64"),
    );

    await prisma.illustration.update({
      where: { id: illustrationId },
      data: {
        status: "COMPLETED",
        imagePath,
        sceneImagePath: imagePath,
        progressPercent: 100,
        progressLabel: "완료",
      },
    });
  } catch (error) {
    console.error("illustration generation failed", error);
    await prisma.illustration.update({
      where: { id: illustrationId },
      data: { status: "FAILED", progressPercent: 0, progressLabel: null },
    });
    revalidateIllustrationWork(illustration.orderId);
    await markOrderPreviewGeneratedIfReady(illustration.orderId);
    return {
      error:
        error instanceof Error
          ? error.message
          : "삽화 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  revalidateIllustrationWork(illustration.orderId);
  await markOrderPreviewGeneratedIfReady(illustration.orderId);
  return { success: true, regenerated: keepImage };
}
