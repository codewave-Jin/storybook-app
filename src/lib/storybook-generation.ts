import { enqueueNextPendingIllustration } from "@/lib/enqueue-illustration-generation";
import { enqueueOrderStyleTransfer } from "@/lib/enqueue-style-transfer";
import { logGenerationEvent } from "@/lib/generation-events";
import { runIllustrationGeneration } from "@/lib/illustration-generate";
import { shouldGenerateIllustration } from "@/lib/illustration-generation-policy";
import {
  buildOrderPromptVariables,
  buildStyledIllustrationPrompt,
  substitutePromptTemplate,
} from "@/lib/illustration-prompt";
import {
  ensureOrderStyledCharacterAsset,
  findReadyStyledCharacterAsset,
  STYLE_TRANSFER_PROGRESS_LABEL,
} from "@/lib/order-character-asset";
import { parseIdList, parseStringRecord } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { markOrderPreviewGeneratedIfReady, revalidateOrderPreview } from "@/lib/preview-status";
import { customInputsContainProfanity } from "@/lib/custom-input-guard";

export {
  ILLUSTRATION_GENERATE_MAX_DURATION_SECONDS,
  isStaleProcessing,
  shouldGenerateIllustration,
  shouldKickPendingIllustration,
  STALE_PROCESSING_MS,
} from "@/lib/illustration-generation-policy";

/** 표지 1 + 본문 — 랜딩 카피(13~15p)에 맞춘 전체 권 분량 */
export const TOTAL_STORYBOOK_PAGES = 14;

/** 결제 전 미리보기: 표지 + 본문 2장 */
export const PREVIEW_PAGE_NUMBERS = [1, 2, 3] as const;

/** false면 결제 후에도 4~14장을 만들지 않는다. 배포 전에 다시 켜면 된다. */
export const FULL_BOOK_GENERATION_ENABLED = false;

export function paidPageNumbers(
  totalPages: number = TOTAL_STORYBOOK_PAGES,
): number[] {
  const pages: number[] = [];
  for (let n = PREVIEW_PAGE_NUMBERS.length + 1; n <= totalPages; n += 1) {
    pages.push(n);
  }
  return pages;
}

async function loadOrderContext(orderId: string) {
  const order = await prisma.storybookOrder.findUnique({
    where: { id: orderId },
    include: {
      template: {
        select: {
          title: true,
          pageTemplates: {
            select: {
              pageNumber: true,
              pageType: true,
              promptTemplate: true,
              expressionHint: true,
            },
          },
        },
      },
      illustrations: {
        select: {
          id: true,
          pageNumber: true,
          status: true,
          prompt: true,
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  const characterIds = parseIdList(order.selectedCharacterIds);
  const characters = await prisma.character.findMany({
    where: { id: { in: characterIds } },
    select: { id: true, label: true },
  });
  const labels = characterIds
    .map((id) => characters.find((character) => character.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const customValues = parseStringRecord(order.customInputValues);
  const variables = buildOrderPromptVariables({
    characterLabels: labels,
    customInputValues: customValues,
  });
  const pageTemplatesByNumber = new Map(
    order.template.pageTemplates.map((page) => [page.pageNumber, page]),
  );

  return { order, characterIds, variables, pageTemplatesByNumber };
}

function sceneFromTemplate(
  pageNumber: number,
  pageTemplatesByNumber: Map<
    number,
    {
      pageNumber: number;
      pageType: "COVER" | "PAGE";
      promptTemplate: string;
      expressionHint: string | null;
    }
  >,
  variables: Record<string, string>,
) {
  const pageTemplate = pageTemplatesByNumber.get(pageNumber);
  if (!pageTemplate) {
    return null;
  }

  const sceneDescription = substitutePromptTemplate(
    pageTemplate.promptTemplate,
    variables,
  );

  return {
    prompt: buildStyledIllustrationPrompt({
      sceneDescription,
      expressionHint: pageTemplate.expressionHint,
    }),
    pageType: pageTemplate.pageType,
  };
}

async function generatePages(options: {
  orderId: string;
  pageNumbers: number[];
  characterIds: string[];
}) {
  const pages = await prisma.illustration.findMany({
    where: {
      orderId: options.orderId,
      pageNumber: { in: options.pageNumbers },
    },
    orderBy: { pageNumber: "asc" },
  });

  for (const page of pages.filter((item) => shouldGenerateIllustration(item))) {
    await runIllustrationGeneration({
      illustrationId: page.id,
      prompt: page.prompt,
      characterIds: options.characterIds,
    });
  }

  await markOrderPreviewGeneratedIfReady(options.orderId);
}

async function releaseStyleTransferHold(orderId: string, pageNumbers: number[]) {
  await prisma.illustration.updateMany({
    where: {
      orderId,
      pageNumber: { in: pageNumbers },
      status: "PROCESSING",
      imagePath: null,
      progressLabel: STYLE_TRANSFER_PROGRESS_LABEL,
    },
    data: {
      status: "IDLE",
      progressPercent: 0,
      progressLabel: "이미지 생성 중",
    },
  });
}

export async function finishStyleTransferAndStartIllustrations(options: {
  orderId: string;
  pageNumbers: number[];
  wait: boolean;
  fromQueueWorker?: boolean;
}): Promise<{ ok: boolean; defer?: boolean; error?: string }> {
  const { orderId, pageNumbers, wait, fromQueueWorker = false } = options;
  const styled = await ensureOrderStyledCharacterAsset(orderId, {
    deferIfBusy: fromQueueWorker,
  });
  if (!styled.ok) {
    if (styled.defer) {
      return { ok: false, defer: true, error: styled.error };
    }
    console.error(
      "[storybook-generation] style transfer failed",
      orderId,
      styled.error,
    );
    await prisma.illustration.updateMany({
      where: {
        orderId,
        pageNumber: { in: pageNumbers },
        status: { not: "COMPLETED" },
      },
      data: {
        status: "FAILED",
        progressPercent: 0,
        progressLabel: null,
        errorReason: styled.error.slice(0, 1000),
      },
    });
    revalidateOrderPreview(orderId);
    return { ok: false, error: styled.error };
  }

  await releaseStyleTransferHold(orderId, pageNumbers);
  revalidateOrderPreview(orderId);

  const order = await prisma.storybookOrder.findUnique({
    where: { id: orderId },
    select: { selectedCharacterIds: true },
  });
  const characterIds = parseIdList(order?.selectedCharacterIds ?? []);

  if (wait) {
    await generatePages({
      orderId,
      pageNumbers,
      characterIds,
    });
    return { ok: true };
  }

  await enqueueNextPendingIllustration(orderId);
  return { ok: true };
}

/**
 * 지정 pageNumber에 대해 Illustration row를 만들고(이미 있으면 skip)
 * IDLE/FAILED만 이미지 생성을 트리거한다.
 */
export async function ensureIllustrationsAndGenerate(options: {
  orderId: string;
  pageNumbers: number[];
  wait?: boolean;
}) {
  const { orderId, pageNumbers, wait = true } = options;
  if (pageNumbers.length === 0) {
    return;
  }

  const ctx = await loadOrderContext(orderId);
  if (!ctx) {
    return;
  }

  logGenerationEvent({
    kind: "STORYBOOK_ORDER",
    entityId: orderId,
    orderId,
    userId: ctx.order.userId,
    step: "storybook.ensure_pages",
    message: "미리보기 페이지 준비 및 생성 트리거",
    detail: { pageNumbers, wait },
  });

  const customValues = parseStringRecord(ctx.order.customInputValues);
  if (customInputsContainProfanity(customValues)) {
    console.warn(
      "[storybook-generation] blocked illustration create due to profanity",
      orderId,
    );
    return;
  }

  const { order, characterIds, variables, pageTemplatesByNumber } = ctx;
  const existingByNumber = new Map(
    order.illustrations.map((row) => [row.pageNumber, row]),
  );

  const missingNumbers = pageNumbers.filter(
    (pageNumber) => !existingByNumber.has(pageNumber),
  );

  if (missingNumbers.length > 0) {
    await prisma.illustration.createMany({
      data: missingNumbers.map((pageNumber) => {
        const scene = sceneFromTemplate(
          pageNumber,
          pageTemplatesByNumber,
          variables,
        );
        if (!scene) {
          console.error(
            `[storybook-generation] PageTemplate missing for ${order.template.title} page ${pageNumber}`,
          );
          return {
            orderId,
            pageNumber,
            prompt: "",
            selectedCharacterIds: characterIds,
            pageType: pageNumber === 1 ? "COVER" : "PAGE",
            isAutoGenerated: true,
            status: "FAILED" as const,
          };
        }

        return {
          orderId,
          pageNumber,
          prompt: scene.prompt,
          selectedCharacterIds: characterIds,
          pageType: scene.pageType,
          isAutoGenerated: true,
        };
      }),
    });
  }

  const pages = await prisma.illustration.findMany({
    where: {
      orderId,
      pageNumber: { in: pageNumbers },
    },
    orderBy: { pageNumber: "asc" },
  });

  const needPromptFill = pages.filter(
    (page) =>
      !page.prompt.trim() &&
      page.status !== "COMPLETED" &&
      page.status !== "PROCESSING",
  );
  if (needPromptFill.length > 0) {
    await Promise.all(
      needPromptFill.map((page) => {
        const scene = sceneFromTemplate(
          page.pageNumber,
          pageTemplatesByNumber,
          variables,
        );
        if (!scene) {
          return prisma.illustration.update({
            where: { id: page.id },
            data: { status: "FAILED" },
          });
        }
        return prisma.illustration.update({
          where: { id: page.id },
          data: {
            prompt: scene.prompt,
            pageType: scene.pageType,
          },
        });
      }),
    );
  }

  const characterId = characterIds[0];
  const readyAsset =
    characterId && order.artStyleId
      ? await findReadyStyledCharacterAsset({
          characterId,
          artStyleId: order.artStyleId,
        })
      : null;

  if (readyAsset) {
    if (order.characterAssetId !== readyAsset.id) {
      await prisma.storybookOrder.update({
        where: { id: orderId },
        data: { characterAssetId: readyAsset.id },
      });
    }
    await releaseStyleTransferHold(orderId, pageNumbers);
    if (wait) {
      await generatePages({
        orderId,
        pageNumbers,
        characterIds,
      });
      return;
    }
    await enqueueNextPendingIllustration(orderId);
    return;
  }

  await prisma.illustration.updateMany({
    where: {
      orderId,
      pageNumber: { in: pageNumbers },
      status: { in: ["IDLE", "FAILED"] },
    },
    data: {
      status: "PROCESSING",
      progressPercent: 8,
      progressLabel: STYLE_TRANSFER_PROGRESS_LABEL,
      errorReason: null,
    },
  });
  revalidateOrderPreview(orderId);

  if (wait) {
    await finishStyleTransferAndStartIllustrations({
      orderId,
      pageNumbers,
      wait: true,
    });
    return;
  }

  await enqueueOrderStyleTransfer(orderId, pageNumbers);
}
