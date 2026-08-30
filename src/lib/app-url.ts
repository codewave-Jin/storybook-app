export function getAppBaseUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  const explicit = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
