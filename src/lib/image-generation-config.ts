export type ImageGenerationQuality = "low" | "medium" | "high";
export type ImageOutputFormat = "png" | "jpeg" | "webp";

function parseImageQuality(
  raw: string | undefined,
): ImageGenerationQuality {
  const value = raw?.trim().toLowerCase();
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "medium";
}

/** Preview and full-book illustrations share this. Override with IMAGE_QUALITY. */
export const IMAGE_QUALITY: ImageGenerationQuality = parseImageQuality(
  process.env.IMAGE_QUALITY,
);

/** @deprecated Use IMAGE_QUALITY. Kept so existing imports keep working. */
export const IMAGE_GEN_QUALITY = IMAGE_QUALITY;

export const IMAGE_GEN_SIZE = "1024x1024" as const;
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
