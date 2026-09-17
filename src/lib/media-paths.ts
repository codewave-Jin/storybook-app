export type MediaVariant = "preview" | "original";

const MEDIA_CACHE_BUST = "4";
const BLOB_HOST = /\.blob\.vercel-storage\.com\//i;

export function isProtectedMediaSrc(src: string) {
  if (!src || src.startsWith("/api/media")) {
    return false;
  }

  if (src.includes("..")) {
    return false;
  }

  if (src.startsWith("/uploads/")) {
    return true;
  }

  if (BLOB_HOST.test(src) && src.includes("/uploads/")) {
    return true;
  }

  if (src.includes("/character-assets/")) {
    return true;
  }

  return false;
}

export function characterMediaSrc(
  id: string,
  kind: "generated" | "photo" = "generated",
  variant: MediaVariant = "preview",
) {
  const base = `/api/media/character/${id}/${kind}`;
  return variant === "original"
    ? `${base}?v=original&cb=${MEDIA_CACHE_BUST}`
    : `${base}?cb=${MEDIA_CACHE_BUST}`;
}

export function illustrationMediaSrc(
  id: string,
  variant: MediaVariant = "preview",
) {
  const base = `/api/media/illustration/${id}`;
  return variant === "original"
    ? `${base}?v=original&cb=${MEDIA_CACHE_BUST}`
    : `${base}?cb=${MEDIA_CACHE_BUST}`;
}

export function stickerMediaSrc(
  id: string,
  kind: "preview" | "final" | "composite" = "preview",
  variant: MediaVariant = "preview",
) {
  const base = `/api/media/sticker/${id}/${kind}`;
  return variant === "original"
    ? `${base}?v=original&cb=${MEDIA_CACHE_BUST}`
    : `${base}?cb=${MEDIA_CACHE_BUST}`;
}

export function toClientCharacterImages<
  T extends {
    id: string;
    generatedImagePath: string | null;
    originalPhotoPath: string;
  },
>(character: T): T {
  return {
    ...character,
    generatedImagePath: character.generatedImagePath
      ? characterMediaSrc(character.id, "generated")
      : null,
    originalPhotoPath: characterMediaSrc(character.id, "photo"),
  };
}

export function toProtectedMediaSrc(
  src: string,
  variant: MediaVariant = "preview",
) {
  if (!isProtectedMediaSrc(src)) {
    return src;
  }

  const params = new URLSearchParams({
    src,
    v: variant,
    cb: MEDIA_CACHE_BUST,
  });
  return `/api/media?${params.toString()}`;
}

export function ownerIdFromStoredPath(src: string) {
  if (!src.startsWith("/uploads/")) {
    return null;
  }

  const parts = src.split("/").filter(Boolean);
  // uploads / folder / userId / filename.ext
  if (parts.length !== 4) {
    return null;
  }

  const folder = parts[1];
  const ownerId = parts[2];
  const filename = parts[3];
  if (
    folder !== "characters" &&
    folder !== "illustrations" &&
    folder !== "stickers" &&
    folder !== "albums"
  ) {
    return null;
  }

  if (!ownerId || ownerId.includes(".") || !filename.includes(".")) {
    return null;
  }

  return ownerId;
}
