export function getAppBaseUrl() {
  // Prefer the current deployment host for server-to-server enqueue
  // (avoids apex→www 308 and stale custom-domain edge cases).
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  const explicit = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) {
    const base = explicit.replace(/\/$/, "");
    if (base === "https://panbagi.co.kr" || base === "http://panbagi.co.kr") {
      return "https://www.panbagi.co.kr";
    }
    return base;
  }

  return "http://localhost:3000";
}
