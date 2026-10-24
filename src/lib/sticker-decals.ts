export const DEFAULT_STICKER_DECAL_KEY = "star";

export const STICKER_DECAL_OPTIONS = [
  {
    key: "star",
    label: "별",
    src: "/stickers/decals/star.png",
    thumbSrc: "/stickers/decals/thumbs/star.png",
  },
  {
    key: "heart",
    label: "하트",
    src: "/stickers/decals/heart.png",
    thumbSrc: "/stickers/decals/thumbs/heart.png",
  },
  {
    key: "moon",
    label: "달",
    src: "/stickers/decals/moon.png",
    thumbSrc: "/stickers/decals/thumbs/moon.png",
  },
  {
    key: "blush",
    label: "블러쉬",
    src: "/stickers/decals/pink-blush.png",
    thumbSrc: "/stickers/decals/thumbs/pink-blush.png",
  },
  {
    key: "crown",
    label: "왕관",
    src: "/stickers/decals/crown.png",
    thumbSrc: "/stickers/decals/thumbs/crown.png",
  },
  {
    key: "tiara",
    label: "티아라",
    src: "/stickers/decals/tiara.png",
    thumbSrc: "/stickers/decals/thumbs/tiara.png",
  },
  {
    key: "magic-wand",
    label: "마법봉",
    src: "/stickers/decals/magic-wand.png",
    thumbSrc: "/stickers/decals/thumbs/magic-wand.png",
  },
  {
    key: "scepter",
    label: "홀",
    src: "/stickers/decals/scepter.png",
    thumbSrc: "/stickers/decals/thumbs/scepter.png",
  },
] as const;

export type StickerDecalKey = (typeof STICKER_DECAL_OPTIONS)[number]["key"];

export function stickerDecalByKey(key: string) {
  return (
    STICKER_DECAL_OPTIONS.find((item) => item.key === key) ?? STICKER_DECAL_OPTIONS[0]
  );
}
