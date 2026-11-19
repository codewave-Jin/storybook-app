import { prisma } from "@/lib/prisma";
import { loadImageAsset } from "@/lib/openai-illustration";
import { generateStickerImage } from "@/lib/sticker-openai";
import { refundTokenHoldsForOrder } from "@/lib/tokens";
import { deleteStickerFile, persistGeneratedStickerBuffer } from "@/lib/uploads";
import {
  buildWordbookExpressionPrompt,
  WORDBOOK_GENERATED_EXPRESSIONS,
  type WordbookExpression,
} from "@/lib/wordbook-prompt";

/** 이 시간이 지나도 GENERATING이면 백그라운드 작업이 끊긴 것으로 본다. */
export const WORDBOOK_STALE_MS = 6 * 60 * 1000;

const PATH_FIELD: Record<WordbookExpression, "curiousImagePath" | "surprisedImagePath"> = {
  curious: "curiousImagePath",
  surprised: "surprisedImagePath",
};

const REGEN_FIELD: Record<WordbookExpression, "curiousRegenCount" | "surprisedRegenCount"> = {
  curious: "curiousRegenCount",
  surprised: "surprisedRegenCount",
};

export function wordbookPathField(expression: WordbookExpression) {
  return PATH_FIELD[expression];
}

export function wordbookRegenField(expression: WordbookExpression) {
  return REGEN_FIELD[expression];
}

async function drawExpression(input: {
  base: { bytes: Buffer; mime: string };
  expression: WordbookExpression;
  userId: string;
}) {
  const generated = await generateStickerImage({
    prompt: buildWordbookExpressionPrompt(input.expression),
    imageBytes: input.base.bytes,
    imageMime: input.base.mime,
    outputFormat: "png",
    quality: "medium",
    background: "opaque",
  });
  const buffer = Buffer.from(generated.b64, "base64");
  return persistGeneratedStickerBuffer(buffer, "image/png", input.userId);
}

/**
 * 비어 있는 표정만 그린다. 둘 다 그려지면 READY, 하나라도 실패하면 FAILED로 두고
 * 미리보기 토큰을 돌려준다. 이미 그려진 표정은 지우지 않는다.
 */
export async function runWordbookGeneration(orderId: string) {
  const order = await prisma.wordbookOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      baseImagePath: true,
      curiousImagePath: true,
      surprisedImagePath: true,
    },
  });
  if (!order) {
    return;
  }

  const missing = WORDBOOK_GENERATED_EXPRESSIONS.filter(
    (expression) => !order[PATH_FIELD[expression]],
  );

  try {
    const stored = await loadImageAsset(order.baseImagePath);
    const base = { bytes: stored.bytes, mime: stored.mime };
    const results = await Promise.allSettled(
      missing.map(async (expression) => ({
        expression,
        path: await drawExpression({ base, expression, userId: order.userId }),
      })),
    );

    const data: Partial<Record<"curiousImagePath" | "surprisedImagePath", string>> = {};
    const errors: string[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        data[PATH_FIELD[result.value.expression]] = result.value.path;
      } else {
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push(reason);
      }
    }

    const failed = errors.length > 0;
    await prisma.wordbookOrder.update({
      where: { id: order.id },
      data: {
        ...data,
        status: failed ? "FAILED" : "READY",
        errorReason: failed ? errors.join(" / ").slice(0, 500) : null,
      },
    });
    if (failed) {
      console.error("[wordbook] expression failed", order.id, errors);
      await refundTokenHoldsForOrder(order.userId, "WORDBOOK_PREVIEW", order.id);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("[wordbook] generation failed", order.id, message);
    await prisma.wordbookOrder.update({
      where: { id: order.id },
      data: { status: "FAILED", errorReason: message.slice(0, 500) },
    });
    await refundTokenHoldsForOrder(order.userId, "WORDBOOK_PREVIEW", order.id);
  }
}

/** 표정 하나를 다시 그린다. 새 그림이 저장된 뒤에 예전 파일을 지운다. */
export async function regenerateWordbookExpression(input: {
  orderId: string;
  userId: string;
  expression: WordbookExpression;
}) {
  const order = await prisma.wordbookOrder.findFirst({
    where: { id: input.orderId, userId: input.userId },
    select: {
      id: true,
      baseImagePath: true,
      curiousImagePath: true,
      surprisedImagePath: true,
    },
  });
  if (!order) {
    throw new Error("NOT_FOUND");
  }

  const stored = await loadImageAsset(order.baseImagePath);
  const nextPath = await drawExpression({
    base: { bytes: stored.bytes, mime: stored.mime },
    expression: input.expression,
    userId: input.userId,
  });
  const field = PATH_FIELD[input.expression];
  const previous = order[field];
  await prisma.wordbookOrder.update({
    where: { id: order.id },
    data: {
      [field]: nextPath,
      [REGEN_FIELD[input.expression]]: { increment: 1 },
    },
  });
  if (previous) {
    await deleteStickerFile(previous).catch(() => undefined);
  }
  return nextPath;
}

/** 대시보드와 결과 화면이 함께 쓰는 상태 응답. 키 순서를 바꾸면 새로고침 비교가 틀어진다. */
export function wordbookStatusPayload(order: {
  status: string;
  curiousImagePath: string | null;
  surprisedImagePath: string | null;
  paymentStatus: string;
}) {
  return {
    status: order.status,
    curiousReady: Boolean(order.curiousImagePath),
    surprisedReady: Boolean(order.surprisedImagePath),
    paymentStatus: order.paymentStatus,
  };
}

/** 백그라운드 작업이 끊겨 GENERATING에 멈춘 주문을 실패로 돌리고 토큰을 돌려준다. */
export async function expireStaleWordbookOrder(order: {
  id: string;
  userId: string;
  status: string;
  updatedAt: Date;
}) {
  if (order.status !== "GENERATING") {
    return false;
  }
  if (Date.now() - order.updatedAt.getTime() < WORDBOOK_STALE_MS) {
    return false;
  }
  const updated = await prisma.wordbookOrder.updateMany({
    where: { id: order.id, status: "GENERATING" },
    data: { status: "FAILED", errorReason: "시간 초과" },
  });
  if (updated.count > 0) {
    await refundTokenHoldsForOrder(order.userId, "WORDBOOK_PREVIEW", order.id);
  }
  return updated.count > 0;
}
