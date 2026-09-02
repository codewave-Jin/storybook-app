import { STYLE_TRANSFER_PROGRESS_LABEL } from "@/lib/order-character-asset";
import {
  countActiveGptImageJobs,
  getGptImageQueueSnapshot,
  queuedProgressLabel,
  runningProgressLabel,
  type GptImageQueueSnapshot,
} from "@/lib/gpt-image-queue";
import { GPT_IMAGE_JOB_KIND } from "@/lib/gpt-image-queue-config";

export type QueueProgressView = {
  queueStatus: "QUEUED" | "RUNNING" | null;
  queueAhead: number;
  label: string;
};

function fromSnapshot(
  snapshot: GptImageQueueSnapshot,
  runningLabel: string,
): QueueProgressView {
  if (snapshot.status === "QUEUED") {
    return {
      queueStatus: "QUEUED",
      queueAhead: snapshot.queueAhead,
      label: queuedProgressLabel(snapshot.queueAhead),
    };
  }
  return {
    queueStatus: "RUNNING",
    queueAhead: snapshot.queueAhead,
    label: runningLabel,
  };
}

export async function illustrationQueueProgress(options: {
  illustrationId: string;
  orderId: string;
  status: string;
  progressLabel: string | null;
}): Promise<QueueProgressView> {
  const illustrationJob = await getGptImageQueueSnapshot(
    GPT_IMAGE_JOB_KIND.ILLUSTRATION,
    options.illustrationId,
  );
  if (illustrationJob) {
    return fromSnapshot(
      illustrationJob,
      runningProgressLabel(GPT_IMAGE_JOB_KIND.ILLUSTRATION),
    );
  }

  const styling =
    options.status === "PROCESSING" &&
    options.progressLabel === STYLE_TRANSFER_PROGRESS_LABEL;
  if (styling || options.status === "PROCESSING") {
    const styleJob = await getGptImageQueueSnapshot(
      GPT_IMAGE_JOB_KIND.STYLE_CHARACTER,
      options.orderId,
    );
    if (styleJob) {
      return fromSnapshot(
        styleJob,
        runningProgressLabel(GPT_IMAGE_JOB_KIND.STYLE_CHARACTER),
      );
    }
  }

  if (options.status === "IDLE" || options.status === "PROCESSING") {
    const queueAhead = await countActiveGptImageJobs();
    return {
      queueStatus: "QUEUED",
      queueAhead,
      label: queuedProgressLabel(queueAhead),
    };
  }

  return {
    queueStatus: null,
    queueAhead: 0,
    label:
      options.status === "COMPLETED"
        ? "완료"
        : (options.progressLabel ?? "생성 중"),
  };
}

export async function stickerQueueProgress(options: {
  stickerOrderId: string;
  previewStatus: string;
}): Promise<QueueProgressView> {
  const job = await getGptImageQueueSnapshot(
    GPT_IMAGE_JOB_KIND.STICKER,
    options.stickerOrderId,
  );
  if (job) {
    return fromSnapshot(
      job,
      runningProgressLabel(GPT_IMAGE_JOB_KIND.STICKER),
    );
  }

  if (
    options.previewStatus === "IDLE" ||
    options.previewStatus === "PROCESSING"
  ) {
    const queueAhead = await countActiveGptImageJobs();
    return {
      queueStatus: "QUEUED",
      queueAhead,
      label: queuedProgressLabel(queueAhead),
    };
  }

  return {
    queueStatus: null,
    queueAhead: 0,
    label:
      options.previewStatus === "FAILED"
        ? "실패"
        : options.previewStatus === "COMPLETED"
          ? "완료"
          : "스티커 생성 중",
  };
}
