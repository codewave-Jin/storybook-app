import { waitUntil } from "@vercel/functions";
import { randomUUID } from "crypto";
import type { GptImageJob, Prisma } from "@prisma/client";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  GPT_IMAGE_ADVISORY_LOCK_KEY,
  GPT_IMAGE_JOB_KIND,
  GPT_IMAGE_JOB_STATUS,
  defaultGptImageJobPriority,
  gptImageConcurrency,
  gptImageInputImagesPerMin,
  gptImageStaleRunningMs,
  gptImageUsageWindowMs,
  type GptImageJobKind,
} from "@/lib/gpt-image-queue-config";
import { gptImageWorkerRequestHeaders } from "@/lib/gpt-image-worker-auth";
import { prisma } from "@/lib/prisma";

export type StyleCharacterJobPayload = {
  pageNumbers?: number[];
};

export type IllustrationJobPayload = {
  chainNext?: boolean;
  keepImage?: boolean;
};

export type StickerJobPayload = {
  [key: string]: unknown;
};

export type GptImageJobPayload =
  | StyleCharacterJobPayload
  | IllustrationJobPayload
  | StickerJobPayload;

export type EnqueueGptImageJobInput = {
  kind: GptImageJobKind;
  targetId: string;
  inputImages: number;
  priority?: number;
  payload?: GptImageJobPayload;
};

export type GptImageQueueSnapshot = {
  jobId: string;
  status: "QUEUED" | "RUNNING";
  queueAhead: number;
  createdAt: Date;
};

export type ClaimResult =
  | { type: "claimed"; job: GptImageJob; workerId: string }
  | { type: "empty" }
  | { type: "concurrency" }
  | { type: "deferred" };

export class GptImageJobDeferError extends Error {
  retryAfterMs: number;

  constructor(retryAfterMs = 15_000, message = "deferred") {
    super(message);
    this.name = "GptImageJobDeferError";
    this.retryAfterMs = retryAfterMs;
  }
}

const ACTIVE_STATUSES = [
  GPT_IMAGE_JOB_STATUS.QUEUED,
  GPT_IMAGE_JOB_STATUS.RUNNING,
] as const;

export function queuedProgressLabel(queueAhead: number) {
  if (queueAhead > 0) {
    return `대기 중 (앞에 ${queueAhead}건)`;
  }
  return "대기 중";
}

export function runningProgressLabel(kind: GptImageJobKind) {
  if (kind === GPT_IMAGE_JOB_KIND.STYLE_CHARACTER) {
    return "캐릭터에 그림체를 입히는 중";
  }
  if (kind === GPT_IMAGE_JOB_KIND.STICKER) {
    return "스티커 생성 중";
  }
  return "이미지 생성 중";
}

async function recoverStaleRunningJobs(
  tx: Prisma.TransactionClient,
  now = new Date(),
) {
  const staleBefore = new Date(now.getTime() - gptImageStaleRunningMs());
  await tx.gptImageJob.updateMany({
    where: {
      status: GPT_IMAGE_JOB_STATUS.RUNNING,
      OR: [{ lockedAt: { lt: staleBefore } }, { lockedAt: null }],
    },
    data: {
      status: GPT_IMAGE_JOB_STATUS.QUEUED,
      lockedAt: null,
      lockedBy: null,
      lastError: "stale running lock recovered",
      runAfter: now,
    },
  });
}

async function budgetWaitMs(
  tx: Prisma.TransactionClient,
  inputImages: number,
  now = new Date(),
) {
  const windowStart = new Date(now.getTime() - gptImageUsageWindowMs());
  const agg = await tx.gptImageUsage.aggregate({
    where: { startedAt: { gte: windowStart } },
    _sum: { inputImages: true },
    _min: { startedAt: true },
  });
  const used = agg._sum.inputImages ?? 0;
  const limit = gptImageInputImagesPerMin();
  if (used + inputImages <= limit) {
    return 0;
  }
  const oldest = agg._min.startedAt;
  if (!oldest) {
    return 1000;
  }
  return Math.max(oldest.getTime() + gptImageUsageWindowMs() - now.getTime(), 1000);
}

export async function enqueueGptImageJob(input: EnqueueGptImageJobInput) {
  const existing = await prisma.gptImageJob.findFirst({
    where: {
      kind: input.kind,
      targetId: input.targetId,
      status: { in: [...ACTIVE_STATUSES] },
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    return { job: existing, created: false };
  }

  const job = await prisma.gptImageJob.create({
    data: {
      kind: input.kind,
      targetId: input.targetId,
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      inputImages: Math.max(1, input.inputImages),
      priority: input.priority ?? defaultGptImageJobPriority(input.kind),
      status: GPT_IMAGE_JOB_STATUS.QUEUED,
    },
  });
  return { job, created: true };
}

export async function hasActiveGptImageJob(
  kind: GptImageJobKind,
  targetIds: string[],
) {
  const active = await activeGptImageTargetIds(kind, targetIds);
  return active.size > 0;
}

export async function activeGptImageTargetIds(
  kind: GptImageJobKind,
  targetIds: string[],
) {
  if (targetIds.length === 0) {
    return new Set<string>();
  }
  const rows = await prisma.gptImageJob.findMany({
    where: {
      kind,
      targetId: { in: targetIds },
      status: { in: [...ACTIVE_STATUSES] },
    },
    select: { targetId: true },
  });
  return new Set(rows.map((row) => row.targetId));
}

export async function hasReadyQueuedGptImageJob() {
  const job = await prisma.gptImageJob.findFirst({
    where: {
      status: GPT_IMAGE_JOB_STATUS.QUEUED,
      runAfter: { lte: new Date() },
    },
    select: { id: true },
  });
  return Boolean(job);
}

export async function getGptImageQueueSnapshot(
  kind: GptImageJobKind,
  targetId: string,
): Promise<GptImageQueueSnapshot | null> {
  const job = await prisma.gptImageJob.findFirst({
    where: {
      kind,
      targetId,
      status: { in: [...ACTIVE_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      priority: true,
    },
  });
  if (
    !job ||
    (job.status !== GPT_IMAGE_JOB_STATUS.QUEUED &&
      job.status !== GPT_IMAGE_JOB_STATUS.RUNNING)
  ) {
    return null;
  }

  const queueAhead = await prisma.gptImageJob.count({
    where: {
      status: { in: [...ACTIVE_STATUSES] },
      id: { not: job.id },
      OR: [
        { status: GPT_IMAGE_JOB_STATUS.RUNNING },
        { priority: { gt: job.priority } },
        { priority: job.priority, createdAt: { lt: job.createdAt } },
        {
          priority: job.priority,
          createdAt: job.createdAt,
          id: { lt: job.id },
        },
      ],
    },
  });

  return {
    jobId: job.id,
    status: job.status,
    queueAhead,
    createdAt: job.createdAt,
  };
}

export async function countActiveGptImageJobs() {
  return prisma.gptImageJob.count({
    where: { status: { in: [...ACTIVE_STATUSES] } },
  });
}

export async function claimNextGptImageJob(): Promise<ClaimResult> {
  const workerId = randomUUID();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(${GPT_IMAGE_ADVISORY_LOCK_KEY})`,
    );
    const now = new Date();
    await recoverStaleRunningJobs(tx, now);

    const running = await tx.gptImageJob.count({
      where: { status: GPT_IMAGE_JOB_STATUS.RUNNING },
    });
    if (running >= gptImageConcurrency()) {
      return { type: "concurrency" };
    }

    const candidates = await tx.$queryRaw<GptImageJob[]>`
      SELECT * FROM "GptImageJob"
      WHERE status = ${GPT_IMAGE_JOB_STATUS.QUEUED}
        AND "runAfter" <= ${now}
      ORDER BY "priority" DESC, "createdAt" ASC, id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 5
    `;

    if (candidates.length === 0) {
      return { type: "empty" };
    }

    let deferredAny = false;
    for (const candidate of candidates) {
      const waitMs = await budgetWaitMs(tx, candidate.inputImages, now);
      if (waitMs > 0) {
        deferredAny = true;
        await tx.gptImageJob.update({
          where: { id: candidate.id },
          data: {
            runAfter: new Date(now.getTime() + waitMs),
            lastError: `input-image window; retry in ${Math.ceil(waitMs / 1000)}s`,
          },
        });
        continue;
      }

      const job = await tx.gptImageJob.update({
        where: { id: candidate.id },
        data: {
          status: GPT_IMAGE_JOB_STATUS.RUNNING,
          lockedAt: now,
          lockedBy: workerId,
          startedAt: now,
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      await tx.gptImageUsage.create({
        data: {
          jobId: job.id,
          inputImages: job.inputImages,
        },
      });
      return { type: "claimed", job, workerId };
    }

    return { type: deferredAny ? "deferred" : "empty" };
  });
}

export async function succeedGptImageJob(jobId: string) {
  await prisma.gptImageJob.update({
    where: { id: jobId },
    data: {
      status: GPT_IMAGE_JOB_STATUS.SUCCEEDED,
      finishedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
    },
  });
}

export async function failGptImageJob(jobId: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown error");
  await prisma.gptImageJob.update({
    where: { id: jobId },
    data: {
      status: GPT_IMAGE_JOB_STATUS.FAILED,
      finishedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: message.slice(0, 1000),
    },
  });
}

export async function deferGptImageJob(
  job: Pick<GptImageJob, "id" | "startedAt">,
  options: { retryAfterMs: number; reason: string },
) {
  if (job.startedAt) {
    await prisma.gptImageUsage.deleteMany({
      where: {
        jobId: job.id,
        startedAt: { gte: job.startedAt },
      },
    });
  }

  const current = await prisma.gptImageJob.findUnique({
    where: { id: job.id },
    select: { attempts: true },
  });

  await prisma.gptImageJob.update({
    where: { id: job.id },
    data: {
      status: GPT_IMAGE_JOB_STATUS.QUEUED,
      runAfter: new Date(Date.now() + Math.max(options.retryAfterMs, 1000)),
      lockedAt: null,
      lockedBy: null,
      startedAt: null,
      attempts: Math.max((current?.attempts ?? 1) - 1, 0),
      lastError: options.reason.slice(0, 1000),
    },
  });
}

export async function requeueGptImageJob(
  jobId: string,
  options: { retryAfterMs: number; error?: unknown; forceFail?: boolean },
) {
  const job = await prisma.gptImageJob.findUnique({
    where: { id: jobId },
    select: { attempts: true, maxAttempts: true },
  });
  if (!job) {
    return { failed: true };
  }

  const message =
    options.error instanceof Error
      ? options.error.message
      : typeof options.error === "string"
        ? options.error
        : null;
  const exhausted = options.forceFail || job.attempts >= job.maxAttempts;
  if (exhausted) {
    await failGptImageJob(jobId, options.error ?? "max attempts exceeded");
    return { failed: true };
  }

  await prisma.gptImageJob.update({
    where: { id: jobId },
    data: {
      status: GPT_IMAGE_JOB_STATUS.QUEUED,
      runAfter: new Date(Date.now() + Math.max(options.retryAfterMs, 1000)),
      lockedAt: null,
      lockedBy: null,
      lastError: (message ?? "requeued").slice(0, 1000),
    },
  });
  return { failed: false };
}

export function kickGptImageWorker() {
  const baseUrl = getAppBaseUrl();
  const dispatched = fetch(`${baseUrl}/api/internal/gpt-image-worker`, {
    method: "POST",
    headers: gptImageWorkerRequestHeaders(),
    body: "{}",
  })
    .then(async (response) => {
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error(
          "[gpt-image-queue] worker kick failed",
          response.status,
          body,
        );
      }
    })
    .catch((error) => {
      console.error("[gpt-image-queue] worker kick failed", error);
    });

  waitUntil(dispatched);
  return dispatched;
}

export function kickGptImageWorkers(count: number) {
  const n = Math.max(0, Math.min(Math.floor(count), gptImageConcurrency()));
  const kicked = [];
  for (let i = 0; i < n; i += 1) {
    kicked.push(kickGptImageWorker());
  }
  return kicked;
}

export async function enqueueAndKickGptImageJob(input: EnqueueGptImageJobInput) {
  const result = await enqueueGptImageJob(input);
  kickGptImageWorker();
  return result;
}
