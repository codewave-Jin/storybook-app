import { isComfyMockEnabled } from "@/lib/comfy-server";
import { parseIdList } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { styleCharacter } from "@/lib/styleCharacter";
import { toOpenAIRateLimitError } from "@/lib/openai-rate-limit";

export const STYLE_TRANSFER_PROGRESS_LABEL = "캐릭터에 그림체를 입히는 중";

const STYLING_WAIT_MS = 8 * 60 * 1000;
const STALE_STYLING_MS = 10 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function findReadyStyledCharacterAsset(options: {
  characterId: string;
  artStyleId: string;
}) {
  return prisma.characterAsset.findFirst({
    where: {
      characterId: options.characterId,
      artStyleId: options.artStyleId,
      status: "READY",
      styledImageUrl: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function waitForAssetReady(assetId: string) {
  const deadline = Date.now() + STYLING_WAIT_MS;
  while (Date.now() < deadline) {
    const asset = await prisma.characterAsset.findUnique({
      where: { id: assetId },
      select: { id: true, status: true, styledImageUrl: true },
    });
    if (!asset) {
      return { ok: false as const, error: "캐릭터 에셋을 찾을 수 없습니다." };
    }
    if (asset.status === "READY" && asset.styledImageUrl) {
      return { ok: true as const, assetId: asset.id, reused: true };
    }
    if (asset.status === "FAILED") {
      return {
        ok: false as const,
        error: "캐릭터 그림체 변환에 실패했습니다.",
      };
    }
    await sleep(2000);
  }
  return {
    ok: false as const,
    error: "캐릭터 그림체 변환이 시간 초과되었습니다.",
  };
}

export async function ensureStyledCharacterAsset(options: {
  characterId: string;
  artStyleId: string;
  deferIfBusy?: boolean;
  onAsset?: (assetId: string) => Promise<void>;
}): Promise<
  | { ok: true; assetId: string; reused: boolean }
  | { ok: false; error: string; defer?: boolean }
> {
  const character = await prisma.character.findUnique({
    where: { id: options.characterId },
    select: { id: true, generatedImagePath: true },
  });
  if (!character) {
    return { ok: false, error: "캐릭터를 찾을 수 없습니다." };
  }
  if (!character.generatedImagePath?.trim()) {
    return { ok: false, error: "캐릭터 초상화(generatedImagePath)가 없습니다." };
  }

  const ready = await findReadyStyledCharacterAsset({
    characterId: options.characterId,
    artStyleId: options.artStyleId,
  });
  if (ready?.styledImageUrl) {
    await options.onAsset?.(ready.id);
    return { ok: true, assetId: ready.id, reused: true };
  }

  const existing = await prisma.characterAsset.findFirst({
    where: {
      characterId: options.characterId,
      artStyleId: options.artStyleId,
    },
    orderBy: { createdAt: "desc" },
  });

  const asset =
    existing ??
    (await prisma.characterAsset.create({
      data: {
        characterId: options.characterId,
        artStyleId: options.artStyleId,
        rawPortraitUrl: character.generatedImagePath,
        status: "PENDING",
      },
    }));

  await options.onAsset?.(asset.id);

  if (isComfyMockEnabled()) {
    await prisma.characterAsset.update({
      where: { id: asset.id },
      data: {
        status: "READY",
        rawPortraitUrl: asset.rawPortraitUrl ?? character.generatedImagePath,
        styledImageUrl: character.generatedImagePath,
      },
    });
    return { ok: true, assetId: asset.id, reused: false };
  }

  const stylingAgeMs = Date.now() - asset.updatedAt.getTime();
  if (asset.status === "STYLING" && stylingAgeMs < STALE_STYLING_MS) {
    if (options.deferIfBusy) {
      return {
        ok: false,
        defer: true,
        error: "캐릭터 그림체 변환이 진행 중입니다.",
      };
    }
    return waitForAssetReady(asset.id);
  }

  const claimed = await prisma.characterAsset.updateMany({
    where: {
      id: asset.id,
      status: { in: ["PENDING", "FAILED"] },
    },
    data: { status: "STYLING" },
  });
  if (claimed.count === 0) {
    const staleClaim = await prisma.characterAsset.updateMany({
      where: {
        id: asset.id,
        status: "STYLING",
        updatedAt: { lt: new Date(Date.now() - STALE_STYLING_MS) },
      },
      data: { status: "STYLING" },
    });
    if (staleClaim.count === 0) {
      const latest = await prisma.characterAsset.findUnique({
        where: { id: asset.id },
        select: { status: true, styledImageUrl: true },
      });
      if (latest?.status === "READY" && latest.styledImageUrl) {
        return { ok: true, assetId: asset.id, reused: true };
      }
      if (options.deferIfBusy) {
        return {
          ok: false,
          defer: true,
          error: "캐릭터 그림체 변환이 진행 중입니다.",
        };
      }
      return waitForAssetReady(asset.id);
    }
  }

  try {
    const styled = await styleCharacter(asset.id);
    if (!styled.success || !styled.styledImageUrl) {
      return {
        ok: false,
        error: styled.error ?? "캐릭터 그림체 변환에 실패했습니다.",
      };
    }
  } catch (error) {
    const rateLimit = toOpenAIRateLimitError(error);
    if (rateLimit) {
      if (options.deferIfBusy) {
        throw rateLimit;
      }
      return { ok: false, error: rateLimit.message };
    }
    throw error;
  }

  return { ok: true, assetId: asset.id, reused: false };
}

export async function ensureOrderStyledCharacterAsset(
  orderId: string,
  options?: { deferIfBusy?: boolean },
): Promise<
  | { ok: true; assetId: string; reused: boolean }
  | { ok: false; error: string; defer?: boolean }
> {
  const order = await prisma.storybookOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      artStyleId: true,
      selectedCharacterIds: true,
      characterAssetId: true,
    },
  });

  if (!order) {
    return { ok: false, error: "주문을 찾을 수 없습니다." };
  }

  const characterId = parseIdList(order.selectedCharacterIds)[0];
  if (!characterId) {
    return { ok: false, error: "주문에 선택된 캐릭터가 없습니다." };
  }
  if (!order.artStyleId) {
    return { ok: false, error: "주문에 그림체가 없습니다." };
  }

  return ensureStyledCharacterAsset({
    characterId,
    artStyleId: order.artStyleId,
    deferIfBusy: options?.deferIfBusy,
    onAsset: async (assetId) => {
      if (order.characterAssetId !== assetId) {
        await prisma.storybookOrder.update({
          where: { id: orderId },
          data: { characterAssetId: assetId },
        });
        order.characterAssetId = assetId;
      }
    },
  });
}
