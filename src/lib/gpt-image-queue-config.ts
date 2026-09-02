export const GPT_IMAGE_JOB_KIND = {
  STYLE_CHARACTER: "STYLE_CHARACTER",
  ILLUSTRATION: "ILLUSTRATION",
  STICKER: "STICKER",
} as const;

export type GptImageJobKind =
  (typeof GPT_IMAGE_JOB_KIND)[keyof typeof GPT_IMAGE_JOB_KIND];

export const GPT_IMAGE_JOB_STATUS = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
} as const;

export type GptImageJobStatus =
  (typeof GPT_IMAGE_JOB_STATUS)[keyof typeof GPT_IMAGE_JOB_STATUS];

export const GPT_IMAGE_ADVISORY_LOCK_KEY = 87201001;

function envInt(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

export function gptImageConcurrency() {
  return envInt("GPT_IMAGE_CONCURRENCY", 2, 1, 8);
}

export function gptImageInputImagesPerMin() {
  return envInt("GPT_IMAGE_INPUT_IMAGES_PER_MIN", 5, 1, 20);
}

export function gptImageWorkerStopBeforeMs() {
  return envInt("GPT_IMAGE_WORKER_STOP_BEFORE_MS", 90_000, 15_000, 180_000);
}

export function gptImageWorkerMaxDurationMs() {
  return envInt("GPT_IMAGE_WORKER_MAX_DURATION_MS", 300_000, 30_000, 300_000);
}

export function gptImageStaleRunningMs() {
  return envInt("GPT_IMAGE_STALE_RUNNING_MS", 360_000, 120_000, 900_000);
}

export function gptImageUsageWindowMs() {
  return 60_000;
}

export function isGptImageQueueBypassed() {
  const value = process.env.GPT_IMAGE_QUEUE_BYPASS?.trim().toLowerCase();
  return value === "1" || value === "true";
}
