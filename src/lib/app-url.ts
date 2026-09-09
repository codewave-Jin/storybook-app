function withHttps(value: string) {
  const trimmed = value.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function canonicalAppUrl(value: string) {
  const raw = withHttps(value);
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "panbagi.co.kr") {
      return "https://www.panbagi.co.kr";
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return raw;
  }
}

export function getAppBaseUrl() {
  // Production worker kicks must hit the public domain. VERCEL_URL is the
  // *.vercel.app deployment host and can be blocked by Deployment Protection,
  // so extra workers never start and GPT jobs run one at a time.
  if (process.env.VERCEL_ENV === "production") {
    const productionHost =
      process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
      process.env.AUTH_URL?.trim() ||
      "www.panbagi.co.kr";
    const canonical = canonicalAppUrl(productionHost);
    if (!/localhost|127\.0\.0\.1/i.test(canonical)) {
      return canonical;
    }
  }

  if (process.env.VERCEL_URL) {
    return canonicalAppUrl(process.env.VERCEL_URL);
  }

  const explicit = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) {
    return canonicalAppUrl(explicit);
  }

  return "http://localhost:3000";
}
