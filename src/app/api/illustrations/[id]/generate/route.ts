import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { unauthorizedIfInvalidInternalKey } from "@/lib/internal-auth";
import { isComfyMockEnabled } from "@/lib/comfy-server";
import { enqueueGptImageJob, kickGptImageWorker } from "@/lib/gpt-image-queue";
import {
  GPT_IMAGE_JOB_KIND,
  gptImageIllustrationPriority,
} from "@/lib/gpt-image-queue-config";
import { runIllustrationGeneration } from "@/lib/illustration-generate";
import {
  shouldGenerateIllustration,
  staleProcessingBefore,
} from "@/lib/illustration-generation-policy";
import { illustrationQueueInputImages } from "@/lib/order-character-asset";
import { parseIdList } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const unauthorized = unauthorizedIfInvalidInternalKey(request);
  if (unauthorized) {
    return unauthorized;
  }

  const illustration = await prisma.illustration.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      pageNumber: true,
      pageType: true,
      prompt: true,
      selectedCharacterIds: true,
      status: true,
      updatedAt: true,
      order: {
        select: {
          artStyleId: true,
        },
      },
    },
  });

  if (!illustration) {
    return NextResponse.json({ error: "Illustration not found" }, { status: 404 });
  }

  if (illustration.status === "COMPLETED") {
    return NextResponse.json({ ok: true, skipped: true, reason: "completed" });
  }

  if (!shouldGenerateIllustration(illustration)) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: "already processing" },
      { status: 202 },
    );
  }

  if (!illustration.prompt.trim()) {
    return NextResponse.json({ error: "prompt is empty" }, { status: 400 });
  }

  const characterIds = parseIdList(illustration.selectedCharacterIds);

  if (isComfyMockEnabled()) {
    waitUntil(
      runIllustrationGeneration({
        illustrationId: illustration.id,
        prompt: illustration.prompt,
        characterIds,
        chainNext: false,
      }).catch((error) => {
        console.error(
          "[illustration generate] background generate failed",
          illustration.id,
          error,
        );
      }),
    );
    return NextResponse.json(
      { ok: true, accepted: true, illustrationId: illustration.id, queued: false },
      { status: 202 },
    );
  }

  await prisma.illustration.updateMany({
    where: {
      id: illustration.id,
      OR: [
        { status: { in: ["IDLE", "FAILED"] } },
        { status: "PROCESSING", updatedAt: { lt: staleProcessingBefore() } },
      ],
    },
    data: {
      status: "PROCESSING",
      progressPercent: 8,
      progressLabel: "대기 중",
      errorReason: null,
    },
  });

  const inputImages = await illustrationQueueInputImages({
    characterIds: parseIdList(illustration.selectedCharacterIds),
    artStyleId: illustration.order.artStyleId,
    pageType: illustration.pageType,
    pageNumber: illustration.pageNumber,
  });

  await enqueueGptImageJob({
    kind: GPT_IMAGE_JOB_KIND.ILLUSTRATION,
    targetId: illustration.id,
    inputImages,
    priority: gptImageIllustrationPriority(
      illustration.pageNumber,
      illustration.pageType,
    ),
    payload: { chainNext: false, keepImage: false },
  });
  kickGptImageWorker();

  return NextResponse.json(
    { ok: true, accepted: true, illustrationId: illustration.id, queued: true },
    { status: 202 },
  );
}
