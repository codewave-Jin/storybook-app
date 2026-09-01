export function getAppBaseUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  const explicit = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) {
    const base = explicit.replace(/\/$/, "");
    // Apex domain permanently redirects to www on this deployment.
    if (base === "https://panbagi.co.kr" || base === "http://panbagi.co.kr") {
      return "https://www.panbagi.co.kr";
    }
    return base;
  }

  return "http://localhost:3000";
}
