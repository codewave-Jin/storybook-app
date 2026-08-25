import { isComfyMockEnabled, postToComfy } from "@/lib/comfy-server";
import { prisma } from "@/lib/prisma";
import { revalidateIllustrationWork } from "@/lib/revalidate-admin";
import { toAbsolutePublicPath } from "@/lib/uploads";

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
  const selectedCharacter = characterIds
    .map((id) => characterMap.get(id))
    .find((character) => character?.generatedImagePath);

  if (!selectedCharacter?.generatedImagePath) {
    return { error: "생성된 캐릭터 이미지가 없습니다." };
  }

  if (illustration.status === "PROCESSING") {
    return { error: "이미 생성 중입니다." };
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
          ? illustration.imagePath ?? selectedCharacter.generatedImagePath
          : selectedCharacter.generatedImagePath,
      },
    });
    revalidateIllustrationWork(illustration.orderId);
    console.log("[comfy mock] illustration completed locally", illustrationId);
    return { success: true, regenerated: keepImage };
  }

  const characterImagePath = toAbsolutePublicPath(
    selectedCharacter.generatedImagePath,
  );

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
      progressLabel: "준비 중",
      imagePath: keepImage ? illustration.imagePath : null,
    },
  });

  if (claimed.count === 0) {
    return { error: "이미 생성 중입니다." };
  }

  try {
    const response = await postToComfy("/generate-illustration", {
      illustration_id: illustrationId,
      character_image_path: characterImagePath,
      prompt,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        "generate-illustration rejected",
        response.status,
        detail,
      );
      await prisma.illustration.update({
        where: { id: illustrationId },
        data: { status: "FAILED" },
      });
      revalidateIllustrationWork(illustration.orderId);
      return {
        error: `삽화 생성 서버가 요청을 받지 못했습니다 (${response.status}). 캐릭터 서버를 확인해 주세요.`,
      };
    }
  } catch (error) {
    console.error("generate-illustration request failed", error);
    await prisma.illustration.update({
      where: { id: illustrationId },
      data: { status: "FAILED" },
    });
    revalidateIllustrationWork(illustration.orderId);
    return {
      error: "삽화 생성 서버에 연결하지 못했습니다. COMFY_SERVER_URL을 확인해 주세요.",
    };
  }

  revalidateIllustrationWork(illustration.orderId);
  return { success: true, regenerated: keepImage };
}
