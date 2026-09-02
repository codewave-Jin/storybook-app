import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

function parseBearer(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function secretsMatch(provided: string, expected: string) {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function gptImageWorkerSecrets() {
  return [
    process.env.GPT_IMAGE_WORKER_SECRET,
    process.env.INTERNAL_API_KEY,
    process.env.CRON_SECRET,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

export function gptImageWorkerRequestHeaders() {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const workerSecret = process.env.GPT_IMAGE_WORKER_SECRET?.trim();
  const apiKey = process.env.INTERNAL_API_KEY?.trim();
  if (workerSecret) {
    headers["x-gpt-image-worker-secret"] = workerSecret;
  }
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  return headers;
}

export function unauthorizedIfInvalidGptImageWorkerKey(request: Request) {
  const allowed = gptImageWorkerSecrets();
  const provided = [
    request.headers.get("x-gpt-image-worker-secret"),
    request.headers.get("x-api-key"),
    parseBearer(request),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (allowed.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[gpt-image-worker] no worker/cron secret set; allowing request in development",
      );
      return null;
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  for (const candidate of provided) {
    for (const expected of allowed) {
      if (secretsMatch(candidate, expected)) {
        return null;
      }
    }
  }

  if (process.env.NODE_ENV !== "production" && provided.length === 0) {
    console.warn(
      "[gpt-image-worker] auth header missing; allowing request in development",
    );
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
