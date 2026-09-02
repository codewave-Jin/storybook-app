import type { GptImageJob } from "@prisma/client";
import { parseIdList } from "@/lib/orders";
import {
  deferGptImageJob,
  failGptImageJob,
  GptImageJobDeferError,
  hasReadyQueuedGptImageJob,
  kickGptImageWorker,
  requeueGptImageJob,
  succeedGptImageJob,
  claimNextGptImageJob,
  type IllustrationJobPayload,
  type StyleCharacterJobPayload,
} from "@/lib/gpt-image-queue";
import {
  GPT_IMAGE_JOB_KIND,
  gptImageWorkerMaxDurationMs,
  gptImageWorkerStopBeforeMs,
} from "@/lib/gpt-image-queue-config";
import { runIllustrationGeneration } from "@/lib/illustration-generate";
import {
  isOpenAIRateLimitError,
  toOpenAIRateLimitError,
} from "@/lib/openai-rate-limit";
import { prisma } from "@/lib/prisma";
import { runStickerPreviewGeneration } from "@/lib/sticker-generation";
import { finishStyleTransferAndStartIllustrations } from "@/lib/storybook-generation";

function asRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

function stylePayload(payload: unknown): StyleCharacterJobPayload {
  const record = asRecord(payload);
  const pageNumbers = Array.isArray(record.pageNumbers)
    ? record.pageNumbers.filter(
        (value): value is number =>
          typeof value === "number" && Number.isInteger(value) && value > 0,
      )
    : [];
  return { pageNumbers };
}

function illustrationPayload(payload: unknown): IllustrationJobPayload {
  const record = asRecord(payload);
  return {
    chainNext: record.chainNext !== false,
    keepImage: record.keepImage === true,
  };
}

async function executeJob(job: GptImageJob) {
  if (job.kind === GPT_IMAGE_JOB_KIND.STYLE_CHARACTER) {
    const payload = stylePayload(job.payload);
    if (payload.pageNumbers.length === 0) {
      throw new Error("STYLE_CHARACTER job is missing pageNumbers");
    }
    const result = await finishStyleTransferAndStartIllustrations({
      orderId: job.targetId,
      pageNumbers: payload.pageNumbers,
      wait: false,
      fromQueueWorker: true,
    });
    if (result.defer) {
      throw new GptImageJobDeferError(15_000, result.error ?? "style busy");
    }
    if (!result.ok) {
      throw new Error(result.error ?? "style transfer failed");
    }
    return;
  }

  if (job.kind === GPT_IMAGE_JOB_KIND.ILLUSTRATION) {
    const payload = illustrationPayload(job.payload);
    const illustration = await prisma.illustration.findUnique({
      where: { id: job.targetId },
      select: {
        id: true,
        prompt: true,
        selectedCharacterIds: true,
      },
    });
    if (!illustration) {
      throw new Error(`Illustration not found: ${job.targetId}`);
    }
    const generated = await runIllustrationGeneration({
      illustrationId: illustration.id,
      prompt: illustration.prompt,
      characterIds: parseIdList(illustration.selectedCharacterIds),
      keepImage: payload.keepImage,
      chainNext: payload.chainNext,
      fromQueue: true,
    });
    if (generated.error) {
      throw new Error(generated.error);
    }
    return;
  }

  if (job.kind === GPT_IMAGE_JOB_KIND.STICKER) {
    const generated = await runStickerPreviewGeneration(job.targetId, {
      fromQueue: true,
    });
    if (generated?.error) {
      throw new Error(generated.error);
    }
    return;
  }

  throw new Error(`Unknown gpt image job kind: ${job.kind}`);
}

export async function runGptImageWorker() {
  const startedAt = Date.now();
  const stopBeforeMs = gptImageWorkerStopBeforeMs();
  const maxDurationMs = gptImageWorkerMaxDurationMs();
  let processed = 0;
  let deferred = 0;
  let stoppedEarly = false;

  while (Date.now() - startedAt < maxDurationMs - stopBeforeMs) {
    const claimed = await claimNextGptImageJob();
    if (claimed.type === "empty") {
      break;
    }
    if (claimed.type === "concurrency") {
      break;
    }
    if (claimed.type === "deferred") {
      deferred += 1;
      break;
    }

    const { job } = claimed;
    try {
      await executeJob(job);
      await succeedGptImageJob(job.id);
      processed += 1;
    } catch (error) {
      const rateLimit = toOpenAIRateLimitError(error);
      if (error instanceof GptImageJobDeferError) {
        await deferGptImageJob(job, {
          retryAfterMs: error.retryAfterMs,
          reason: error.message,
        });
        deferred += 1;
        continue;
      }
      if (rateLimit || isOpenAIRateLimitError(error)) {
        const retryAfterMs = rateLimit?.retryAfterMs ?? 60_000;
        const requeued = await requeueGptImageJob(job.id, {
          retryAfterMs,
          error: rateLimit ?? error,
        });
        console.warn(
          "[gpt-image-worker] 429 backoff",
          job.id,
          job.kind,
          `${Math.ceil(retryAfterMs / 1000)}s`,
          requeued.failed ? "exhausted" : "requeued",
        );
        continue;
      }
      console.error("[gpt-image-worker] job failed", job.id, job.kind, error);
      await failGptImageJob(job.id, error);
      processed += 1;
    }
  }

  if (Date.now() - startedAt >= maxDurationMs - stopBeforeMs) {
    stoppedEarly = true;
  }

  if (processed > 0 || stoppedEarly) {
    if (await hasReadyQueuedGptImageJob()) {
      kickGptImageWorker();
    }
  }

  return {
    ok: true,
    processed,
    deferred,
    stoppedEarly,
    elapsedMs: Date.now() - startedAt,
  };
}
