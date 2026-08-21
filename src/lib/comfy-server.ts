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
