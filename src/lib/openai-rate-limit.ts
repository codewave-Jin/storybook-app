export class OpenAIRateLimitError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "OpenAIRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

function errorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

function errorHeaders(error: unknown): Headers | undefined {
  if (!error || typeof error !== "object" || !("headers" in error)) {
    return undefined;
  }
  const headers = (error as { headers?: unknown }).headers;
  if (headers instanceof Headers) {
    return headers;
  }
  return undefined;
}

function headerValue(error: unknown, name: string): string | undefined {
  const headers = errorHeaders(error);
  const fromHeaders = headers?.get(name) ?? headers?.get(name.toLowerCase());
  if (fromHeaders) {
    return fromHeaders;
  }
  if (!error || typeof error !== "object" || !("headers" in error)) {
    return undefined;
  }
  const raw = (error as { headers?: Record<string, unknown> }).headers;
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const value = raw[name] ?? raw[name.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

export function parseRetryAfterMs(error: unknown, fallbackMs = 60_000): number {
  const retryAfter = headerValue(error, "retry-after");
  if (retryAfter) {
    const asSeconds = Number.parseFloat(retryAfter);
    if (Number.isFinite(asSeconds) && asSeconds >= 0) {
      return Math.min(Math.ceil(asSeconds * 1000), 5 * 60_000);
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/try again in\s+([\d.]+)\s*s/i);
  if (match) {
    const seconds = Number.parseFloat(match[1]);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(Math.ceil(seconds * 1000), 5 * 60_000);
    }
  }

  return fallbackMs;
}

export function isOpenAIRateLimitError(
  error: unknown,
): error is OpenAIRateLimitError {
  return error instanceof OpenAIRateLimitError;
}

export function toOpenAIRateLimitError(
  error: unknown,
): OpenAIRateLimitError | null {
  if (error instanceof OpenAIRateLimitError) {
    return error;
  }
  if (errorStatus(error) !== 429) {
    return null;
  }
  const message = error instanceof Error ? error.message : String(error);
  return new OpenAIRateLimitError(message, parseRetryAfterMs(error));
}
