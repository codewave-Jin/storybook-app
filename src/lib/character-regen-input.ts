export type RegenInputChoice = "original" | "styled" | "upload";

export type CharacterRegenAsset = {
  styledImageUrl?: string | null;
  regenInputUrl?: string | null;
  regenInputChoice?: string | null;
};

export function parseRegenUploads(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const url = item.trim();
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export function parseRegenInputChoice(
  value: string | null | undefined,
): RegenInputChoice | null {
  if (value === "original" || value === "styled" || value === "upload") {
    return value;
  }
  return null;
}

export function illustrationCharacterInputUrl(
  asset: CharacterRegenAsset | null | undefined,
  originalUrl?: string | null,
) {
  const original = originalUrl?.trim() || null;
  const styled = asset?.styledImageUrl?.trim() || null;
  const upload = asset?.regenInputUrl?.trim() || null;
  const choice = parseRegenInputChoice(asset?.regenInputChoice);

  if (choice === "original") {
    return original || styled || upload;
  }
  if (choice === "styled") {
    return styled || original || upload;
  }
  if (choice === "upload") {
    return upload || styled || original;
  }
  return upload || styled || original;
}
