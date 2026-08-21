function comfyServerBaseUrl() {
  const url = process.env.COMFY_SERVER_URL?.trim().replace(/\/+$/, "");
  if (!url) {
    throw new Error("COMFY_SERVER_URL이 설정되지 않았습니다.");
  }

  return url;
}

export function comfyServerUrl(pathname: string) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${comfyServerBaseUrl()}${path}`;
}

export function comfyServerHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...extra,
  };
}

export async function postToComfy(pathname: string, body: unknown) {
  const url = comfyServerUrl(pathname);
  const headers = comfyServerHeaders();
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      return response;
    } catch (error) {
      lastError = error;
      console.error(`comfy POST ${pathname} attempt ${attempt} failed`, error);
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }

  throw lastError;
}

