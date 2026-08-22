"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { postToComfy } from "@/lib/comfy-server";
import { parseExpression } from "@/lib/expressions";
import { prisma } from "@/lib/prisma";
import { toAbsolutePublicPath } from "@/lib/uploads";

function revalidateIllustration(orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/illustrations");
  revalidatePath(`/admin/illustrations/${orderId}`);
  revalidatePath("/admin/upscale");
  revalidatePath(`/admin/upscale/${orderId}`);
}

export async function addIllustrationPage(orderId: string) {
  await requireAdmin();

  const last = await prisma.illustration.findFirst({
    where: { orderId },
    orderBy: { pageNumber: "desc" },
    select: { pageNumber: true },
  });

  await prisma.illustration.create({
    data: {
      orderId,
      pageNumber: (last?.pageNumber ?? 0) + 1,
      prompt: "",
      selectedCharacterIds: [],
    },
  });

  revalidateIllustration(orderId);
}

export type IllustrationActionState = {
  error?: string;
  success?: boolean;
  regenerated?: boolean;
} | undefined;

export async function requestIllustrationGeneration(
  _prevState: IllustrationActionState,
  formData: FormData,
): Promise<IllustrationActionState> {
  await requireAdmin();

  const illustrationId = String(formData.get("illustrationId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const keepImage = String(formData.get("keepImage") ?? "") === "1";
  const characterIds = formData
    .getAll("characterIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!illustrationId) {
    return { error: "페이지를 찾을 수 없습니다." };
  }

  if (!prompt) {
    return { error: "프롬프트를 입력해 주세요." };
  }

  if (characterIds.length < 1) {
    return { error: "캐릭터를 한 명 이상 선택해 주세요." };
  }

  const illustration = await prisma.illustration.findUnique({
    where: { id: illustrationId },
  });

  if (!illustration) {
    return { error: "페이지를 찾을 수 없습니다." };
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
      revalidateIllustration(illustration.orderId);
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
    revalidateIllustration(illustration.orderId);
    return {
      error: "삽화 생성 서버에 연결하지 못했습니다. COMFY_SERVER_URL을 확인해 주세요.",
    };
  }

  revalidateIllustration(illustration.orderId);
  return { success: true, regenerated: keepImage };
}

export async function requestIllustrationExpressionEdit(
  _prevState: IllustrationActionState,
  formData: FormData,
): Promise<IllustrationActionState> {
  await requireAdmin();

  const illustrationId = String(formData.get("illustrationId") ?? "");
  const expression = parseExpression(formData.get("expression"));

  if (!illustrationId) {
    return { error: "페이지를 찾을 수 없습니다." };
  }

  if (expression === "default") {
    return { error: "바꿀 표정을 선택해 주세요." };
  }

  const illustration = await prisma.illustration.findUnique({
    where: { id: illustrationId },
  });

  if (!illustration) {
    return { error: "페이지를 찾을 수 없습니다." };
  }

  if (!illustration.imagePath && !illustration.sceneImagePath) {
    return { error: "먼저 삽화를 생성해 주세요." };
  }

  if (illustration.status === "PROCESSING") {
    return { error: "이미 생성 중입니다." };
  }

  const sceneSource = illustration.sceneImagePath ?? illustration.imagePath;
  if (!sceneSource) {
    return { error: "먼저 삽화를 생성해 주세요." };
  }

  const claimed = await prisma.illustration.updateMany({
    where: {
      id: illustrationId,
      NOT: { status: "PROCESSING" },
    },
    data: {
      status: "PROCESSING",
      progressPercent: 8,
      progressLabel: "준비 중",
      ...(illustration.sceneImagePath ? {} : { sceneImagePath: sceneSource }),
    },
  });

  if (claimed.count === 0) {
    return { error: "이미 생성 중입니다." };
  }

  try {
    const response = await postToComfy("/edit-illustration-expression", {
      illustration_id: illustrationId,
      image_path: toAbsolutePublicPath(sceneSource),
      expression,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        "edit-illustration-expression rejected",
        response.status,
        detail,
      );
      await prisma.illustration.update({
        where: { id: illustrationId },
        data: { status: "FAILED" },
      });
      revalidateIllustration(illustration.orderId);
      return {
        error: `표정 변경 서버가 요청을 받지 못했습니다 (${response.status}). 캐릭터 서버를 확인해 주세요.`,
      };
    }
  } catch (error) {
    console.error("edit-illustration-expression request failed", error);
    await prisma.illustration.update({
      where: { id: illustrationId },
      data: { status: "FAILED" },
    });
    revalidateIllustration(illustration.orderId);
    return {
      error: "표정 변경 서버에 연결하지 못했습니다. COMFY_SERVER_URL을 확인해 주세요.",
    };
  }

  revalidateIllustration(illustration.orderId);
  return { success: true };
}

export async function restoreIllustrationSceneOriginal(
  _prevState: IllustrationActionState,
  formData: FormData,
): Promise<IllustrationActionState> {
  await requireAdmin();

  const illustrationId = String(formData.get("illustrationId") ?? "");
  if (!illustrationId) {
    return { error: "페이지를 찾을 수 없습니다." };
  }

  const illustration = await prisma.illustration.findUnique({
    where: { id: illustrationId },
  });

  if (!illustration) {
    return { error: "페이지를 찾을 수 없습니다." };
  }

  if (illustration.status === "PROCESSING") {
    return { error: "이미 생성 중입니다." };
  }

  if (!illustration.sceneImagePath) {
    return { error: "되돌릴 원본 장면이 없습니다." };
  }

  if (illustration.imagePath === illustration.sceneImagePath) {
    return { success: true };
  }

  await prisma.illustration.update({
    where: { id: illustrationId },
    data: {
      imagePath: illustration.sceneImagePath,
      status: "COMPLETED",
      progressPercent: 100,
      progressLabel: "완료",
    },
  });

  revalidateIllustration(illustration.orderId);
  return { success: true };
}

export async function deleteIllustrationPage(illustrationId: string) {
  await requireAdmin();

  const illustration = await prisma.illustration.findUnique({
    where: { id: illustrationId },
  });

  if (!illustration) {
    return;
  }

  const orderId = illustration.orderId;

  await prisma.$transaction(async (tx) => {
    await tx.illustration.delete({ where: { id: illustrationId } });

    const remaining = await tx.illustration.findMany({
      where: { orderId },
      orderBy: { pageNumber: "asc" },
    });

    for (let index = 0; index < remaining.length; index += 1) {
      await tx.illustration.update({
        where: { id: remaining[index].id },
        data: { pageNumber: index + 1 },
      });
    }
  });

  revalidateIllustration(orderId);
}

export async function markOrderIllustrationsComplete(orderId: string) {
  await requireAdmin();

  await prisma.storybookOrder.update({
    where: { id: orderId },
    data: { productionStatus: "UPSCALING" },
  });

  revalidateIllustration(orderId);
}

export async function copyOriginalToUpscaled(illustrationId: string) {
  await requireAdmin();

  const illustration = await prisma.illustration.findUnique({
    where: { id: illustrationId },
  });

  if (!illustration?.imagePath) {
    return { error: "원본 이미지가 없습니다." };
  }

  // TODO: 실제 업스케일 워크플로우 연동 시 이 부분을 교체하세요.
  // 지금은 원본 imagePath를 upscaledImagePath에 그대로 복사합니다.
  await prisma.illustration.update({
    where: { id: illustrationId },
    data: {
      upscaledImagePath: illustration.imagePath,
    },
  });

  revalidateIllustration(illustration.orderId);
  return { success: true };
}
