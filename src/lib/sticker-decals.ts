export const DEFAULT_STICKER_DECAL_KEY = "star";

export const STICKER_DECAL_OPTIONS = [
  {
    key: "star",
    label: "별",
    src: "/stickers/decals/star.png",
  },
  {
    key: "heart",
    label: "하트",
    src: "/stickers/decals/heart.png",
  },
] as const;

export type StickerDecalKey = (typeof STICKER_DECAL_OPTIONS)[number]["key"];

export function stickerDecalByKey(key: string) {
  return (
    STICKER_DECAL_OPTIONS.find((item) => item.key === key) ?? STICKER_DECAL_OPTIONS[0]
  );
}
