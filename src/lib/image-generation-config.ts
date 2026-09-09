export type ImageGenerationQuality = "low" | "medium" | "high";
export type ImageOutputFormat = "png" | "jpeg" | "webp";

function parseImageQuality(
  raw: string | undefined,
  fallback: ImageGenerationQuality = "low",
): ImageGenerationQuality {
  const value = raw?.trim().toLowerCase();
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return fallback;
}

/** Illustrations and stickers. Override with IMAGE_QUALITY. */
export const IMAGE_QUALITY: ImageGenerationQuality = parseImageQuality(
  process.env.IMAGE_QUALITY,
);

/**
 * Style transfer (portrait + art-style reference) only.
 * Defaults to medium so facial identity survives the restyle.
 * Page/sticker images stay on IMAGE_QUALITY.
 * Override with STYLE_TRANSFER_QUALITY.
 */
export const STYLE_TRANSFER_QUALITY: ImageGenerationQuality = parseImageQuality(
  process.env.STYLE_TRANSFER_QUALITY,
  "medium",
);

/** @deprecated Use IMAGE_QUALITY. Kept so existing imports keep working. */
export const IMAGE_GEN_QUALITY = IMAGE_QUALITY;

/** Style transfer and stickers stay square. */
export const IMAGE_GEN_SIZE = "1024x1024" as const;
export const COVER_ILLUSTRATION_SIZE = "1024x1024" as const;
/** Interior spread: one image printed across two open pages. */
export const PAGE_ILLUSTRATION_SIZE = "2048x1024" as const;

export type IllustrationImageSize =
  | typeof COVER_ILLUSTRATION_SIZE
  | typeof PAGE_ILLUSTRATION_SIZE;

export function illustrationSizeForPageType(
  pageType: string | null | undefined,
): IllustrationImageSize {
  return pageType === "COVER"
    ? COVER_ILLUSTRATION_SIZE
    : PAGE_ILLUSTRATION_SIZE;
}

export const ILLUSTRATION_OUTPUT_FORMAT: ImageOutputFormat = "jpeg";
export const STICKER_OUTPUT_FORMAT: ImageOutputFormat = "jpeg";

export function mimeForOutputFormat(format: ImageOutputFormat): string {
  if (format === "jpeg") {
    return "image/jpeg";
  }
  if (format === "webp") {
    return "image/webp";
  }
  return "image/png";
}

export function extensionForOutputFormat(format: ImageOutputFormat): string {
  if (format === "jpeg") {
    return "jpg";
  }
  if (format === "webp") {
    return "webp";
  }
  return "png";
}
