/** Pro 상한. Hobby는 Vercel이 60초로 캡한다. */
export const ILLUSTRATION_GENERATE_MAX_DURATION_SECONDS = 300;

/**
 * Hobby(60s)에서 waitUntil이 죽은 PROCESSING을 다시 집어가기 위한 대기.
 * Pro에서도 OpenAI 응답이 길 수 있어 너무 짧으면 중복 실행되므로
 * 약 75초 이후에만 stale로 본다.
 */
export const STALE_PROCESSING_MS = 75_000;

export function staleProcessingBefore(now = Date.now()) {
  return new Date(now - STALE_PROCESSING_MS);
}

export function isStaleProcessing(updatedAt: Date, now = Date.now()) {
  return now - updatedAt.getTime() >= STALE_PROCESSING_MS;
}

export function shouldGenerateIllustration(page: {
  status: string;
  prompt: string;
  updatedAt: Date;
}) {
  if (!page.prompt.trim()) {
    return false;
  }
  if (page.status === "COMPLETED") {
    return false;
  }
  if (page.status === "PROCESSING") {
    return isStaleProcessing(page.updatedAt);
  }
  return page.status === "IDLE" || page.status === "FAILED";
}

/** preview 폴링용. FAILED는 제외해 실패 페이지를 5초마다 재시도하지 않는다. */
export function shouldKickPendingIllustration(page: {
  status: string;
  prompt: string;
  updatedAt: Date;
}) {
  if (!page.prompt.trim()) {
    return false;
  }
  if (page.status === "IDLE") {
    return true;
  }
  return page.status === "PROCESSING" && isStaleProcessing(page.updatedAt);
}
