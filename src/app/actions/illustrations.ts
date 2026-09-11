"use server";

import { requireAdmin } from "@/lib/admin";
import { parseExpression } from "@/lib/expressions";
import { enqueueAndKickGptImageJob } from "@/lib/gpt-image-queue";
import { GPT_IMAGE_JOB_KIND } from "@/lib/gpt-image-queue-config";
import { runIllustrationGeneration } from "@/lib/illustration-generate";
import { prisma } from "@/lib/prisma";
import {
  revalidateAdminOrderViews,
  revalidateIllustrationWork,
} from "@/lib/revalidate-admin";
import { isComfyMockEnabled, postToComfy } from "@/lib/comfy-server";
import {
  saveAdminCharacterFile,
  saveAdminIllustrationFile,
  toAbsolutePublicPath,
} from "@/lib/uploads";
import { illustrationQueueInputImages } from "@/lib/order-character-asset";
import {
  parseRegenInputChoice,
  parseRegenUploads,
} from "@/lib/character-regen-input";
import { parseIdList } from "@/lib/orders";
import {
  archiveIllustrationVersion,
  parseIllustrationVersions,
} from "@/lib/illustration-versions";

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

  revalidateIllustrationWork(orderId);
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

  if (isComfyMockEnabled()) {
    return runIllustrationGeneration({
      illustrationId,
      prompt,
      characterIds,
      keepImage,
    });
  }

  const illustration = await prisma.illustration.findUnique({
    where: { id: illustrationId },
    select: {
      orderId: true,
      pageType: true,
      pageNumber: true,
      order: {
        select: {
          artStyleId: true,
        },
      },
    },
  });
  if (!illustration) {
    return { error: "페이지를 찾을 수 없습니다." };
  }

  await prisma.illustration.update({
    where: { id: illustrationId },
    data: {
      prompt,
      selectedCharacterIds: characterIds,
      status: "PROCESSING",
      progressPercent: 8,
      progressLabel: "대기 중",
      errorReason: null,
      imagePath: keepImage ? undefined : null,
    },
  });

  const inputImages = await illustrationQueueInputImages({
    characterIds,
    artStyleId: illustration.order.artStyleId,
    pageType: illustration.pageType,
    pageNumber: illustration.pageNumber,
  });

  await enqueueAndKickGptImageJob({
    kind: GPT_IMAGE_JOB_KIND.ILLUSTRATION,
    targetId: illustrationId,
    inputImages,
    payload: { chainNext: false, keepImage },
  });
  revalidateIllustrationWork(illustration.orderId);
  return { success: true };
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

  if (isComfyMockEnabled()) {
    await prisma.illustration.update({
      where: { id: illustrationId },
      data: {
        status: "COMPLETED",
        progressPercent: 100,
        progressLabel: "로컬 목업",
        ...(illustration.sceneImagePath ? {} : { sceneImagePath: sceneSource }),
      },
    });
    revalidateIllustrationWork(illustration.orderId);
    console.log("[comfy mock] expression edit skipped locally", illustrationId);
    return { success: true };
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
      revalidateIllustrationWork(illustration.orderId);
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
    revalidateIllustrationWork(illustration.orderId);
    return {
      error: "표정 변경 서버에 연결하지 못했습니다. COMFY_SERVER_URL을 확인해 주세요.",
    };
  }

  revalidateIllustrationWork(illustration.orderId);
  return { success: true };
}

export async function restoreIllustrationVersion(
  _prevState: IllustrationActionState,
  formData: FormData,
): Promise<IllustrationActionState> {
  await requireAdmin();

  const illustrationId = String(formData.get("illustrationId") ?? "");
  const versionPath = String(formData.get("versionPath") ?? "").trim();
  if (!illustrationId) {
    return { error: "페이지를 찾을 수 없습니다." };
  }
  if (!versionPath) {
    return { error: "되돌릴 이미지를 선택해 주세요." };
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

  const versions = parseIllustrationVersions(illustration.imageVersions);
  if (!versions.some((item) => item.path === versionPath)) {
    return { error: "이전 버전을 찾을 수 없습니다." };
  }

  await prisma.illustration.update({
    where: { id: illustrationId },
    data: {
      imagePath: versionPath,
      sceneImagePath: versionPath,
      imageVersions: archiveIllustrationVersion({
        imagePath: illustration.imagePath,
        sceneImagePath: illustration.sceneImagePath,
        versions: illustration.imageVersions,
        source: "generate",
      }),
      status: "COMPLETED",
      progressPercent: 100,
      progressLabel: "완료",
      errorReason: null,
    },
  });

  revalidateIllustrationWork(illustration.orderId);
  return { success: true };
}

export async function uploadIllustrationReplacement(
  _prevState: IllustrationActionState,
  formData: FormData,
): Promise<IllustrationActionState> {
  await requireAdmin();

  const illustrationId = String(formData.get("illustrationId") ?? "");
  const file = formData.get("file");
  if (!illustrationId) {
    return { error: "페이지를 찾을 수 없습니다." };
  }
  if (!(file instanceof File) || file.size < 1) {
    return { error: "올릴 이미지 파일을 선택해 주세요." };
  }

  const illustration = await prisma.illustration.findUnique({
    where: { id: illustrationId },
  });

  if (!illustration) {
    return { error: "페이지를 찾을 수 없습니다." };
  }

  if (illustration.status === "PROCESSING") {
    return { error: "생성 중에는 파일을 올릴 수 없습니다." };
  }

  try {
    const imagePath = await saveAdminIllustrationFile(file);
    await prisma.illustration.update({
      where: { id: illustrationId },
      data: {
        imagePath,
        sceneImagePath: imagePath,
        imageVersions: archiveIllustrationVersion({
          imagePath: illustration.imagePath,
          sceneImagePath: illustration.sceneImagePath,
          versions: illustration.imageVersions,
        }),
        status: "COMPLETED",
        progressPercent: 100,
        progressLabel: "완료",
        errorReason: null,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "파일 업로드에 실패했습니다.",
    };
  }

  revalidateIllustrationWork(illustration.orderId);
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

  revalidateIllustrationWork(orderId);
}

export async function markOrderIllustrationsComplete(orderId: string) {
  await requireAdmin();

  await prisma.storybookOrder.update({
    where: { id: orderId },
    data: { productionStatus: "UPSCALING" },
  });

  revalidateAdminOrderViews(orderId);
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

  revalidateIllustrationWork(illustration.orderId);
  return { success: true };
}

export async function uploadOrderCharacterInput(
  _prevState: IllustrationActionState,
  formData: FormData,
): Promise<IllustrationActionState> {
  await requireAdmin();

  const orderId = String(formData.get("orderId") ?? "").trim();
  const characterId = String(formData.get("characterId") ?? "").trim();
  const file = formData.get("file");

  if (!orderId || !characterId) {
    return { error: "캐릭터를 찾을 수 없습니다." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "이미지를 선택해 주세요." };
  }

  const order = await prisma.storybookOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      artStyleId: true,
      selectedCharacterIds: true,
    },
  });
  if (!order?.artStyleId) {
    return { error: "주문 그림체를 찾을 수 없습니다." };
  }

  const characterIds = parseIdList(order.selectedCharacterIds);
  if (!characterIds.includes(characterId)) {
    return { error: "이 주문의 캐릭터가 아닙니다." };
  }

  let imagePath: string;
  try {
    imagePath = await saveAdminCharacterFile(file);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
    };
  }

  const existing = await prisma.characterAsset.findFirst({
    where: {
      characterId,
      artStyleId: order.artStyleId,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const uploads = parseRegenUploads(existing.regenUploads);
    if (!uploads.includes(imagePath)) {
      uploads.push(imagePath);
    }
    await prisma.characterAsset.update({
      where: { id: existing.id },
      data: {
        regenInputUrl: imagePath,
        regenInputChoice: "upload",
        regenUploads: uploads,
        status: "READY",
      },
    });
  } else {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { generatedImagePath: true },
    });
    await prisma.characterAsset.create({
      data: {
        characterId,
        artStyleId: order.artStyleId,
        rawPortraitUrl: character?.generatedImagePath ?? imagePath,
        regenInputUrl: imagePath,
        regenInputChoice: "upload",
        regenUploads: [imagePath],
        status: "READY",
      },
    });
  }

  revalidateIllustrationWork(orderId);
  return { success: true };
}

async function loadOrderCharacterForInput(orderId: string, characterId: string) {
  const order = await prisma.storybookOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      artStyleId: true,
      selectedCharacterIds: true,
    },
  });
  if (!order) {
    return { error: "주문을 찾을 수 없습니다." as const };
  }
  const artStyleId = order.artStyleId?.trim() || "";
  if (!artStyleId) {
    return { error: "주문 그림체를 찾을 수 없습니다." as const };
  }

  const characterIds = parseIdList(order.selectedCharacterIds);
  if (!characterIds.includes(characterId)) {
    return { error: "이 주문의 캐릭터가 아닙니다." as const };
  }

  return { order: { ...order, artStyleId } };
}

export async function selectOrderCharacterInput(
  _prevState: IllustrationActionState,
  formData: FormData,
): Promise<IllustrationActionState> {
  await requireAdmin();

  const orderId = String(formData.get("orderId") ?? "").trim();
  const characterId = String(formData.get("characterId") ?? "").trim();
  const choice = parseRegenInputChoice(String(formData.get("choice") ?? ""));
  const inputUrl = String(formData.get("inputUrl") ?? "").trim();

  if (!orderId || !characterId) {
    return { error: "캐릭터를 찾을 수 없습니다." };
  }
  if (!choice) {
    return { error: "사용할 캐릭터를 선택해 주세요." };
  }

  const loaded = await loadOrderCharacterForInput(orderId, characterId);
  if ("error" in loaded) {
    return { error: loaded.error };
  }
  const { order } = loaded;

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { generatedImagePath: true, originalPhotoPath: true },
  });
  if (!character) {
    return { error: "캐릭터를 찾을 수 없습니다." };
  }

  const existing = await prisma.characterAsset.findFirst({
    where: {
      characterId,
      artStyleId: order.artStyleId,
    },
    orderBy: { createdAt: "desc" },
  });

  const original =
    character.generatedImagePath?.trim() ||
    existing?.rawPortraitUrl?.trim() ||
    character.originalPhotoPath?.trim() ||
    null;
  const styled = existing?.styledImageUrl?.trim() || null;
  const uploads = parseRegenUploads(existing?.regenUploads);
  if (
    existing?.regenInputUrl?.trim() &&
    !uploads.includes(existing.regenInputUrl.trim())
  ) {
    uploads.push(existing.regenInputUrl.trim());
  }

  if (choice === "original" && !original) {
    return { error: "입력 캐릭터가 없습니다." };
  }
  if (choice === "styled" && !styled) {
    return { error: "그림체 변환 이미지가 없습니다." };
  }
  if (choice === "upload") {
    if (!inputUrl || !uploads.includes(inputUrl)) {
      return { error: "올린 캐릭터를 찾을 수 없습니다." };
    }
  }

  const regenInputUrl = choice === "upload" ? inputUrl : existing?.regenInputUrl;

  if (existing) {
    await prisma.characterAsset.update({
      where: { id: existing.id },
      data: {
        regenInputChoice: choice,
        regenInputUrl,
        regenUploads: uploads,
        status: "READY",
      },
    });
  } else {
    await prisma.characterAsset.create({
      data: {
        characterId,
        artStyleId: order.artStyleId,
        rawPortraitUrl: original,
        regenInputChoice: choice,
        regenInputUrl: choice === "upload" ? inputUrl : null,
        regenUploads: uploads,
        status: "READY",
      },
    });
  }

  revalidateIllustrationWork(orderId);
  return { success: true };
}
