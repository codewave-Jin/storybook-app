export const STICKER_FONT_OPTIONS = [
  {
    key: "jua",
    label: "주아",
    cssFamily: '"Jua", sans-serif',
    cssWeight: 400,
    files: ["public/fonts/Jua-Regular.ttf"],
  },
  {
    key: "malgun-bold",
    label: "맑은 고딕 굵게",
    cssFamily: '"Malgun Gothic", sans-serif',
    cssWeight: 700,
    files: ["C:\\Windows\\Fonts\\malgunbd.ttf"],
  },
  {
    key: "malgun",
    label: "맑은 고딕",
    cssFamily: '"Malgun Gothic", sans-serif',
    cssWeight: 400,
    files: ["C:\\Windows\\Fonts\\malgun.ttf"],
  },
  {
    key: "gulim",
    label: "굴림",
    cssFamily: "Gulim, sans-serif",
    cssWeight: 400,
    files: ["C:\\Windows\\Fonts\\gulim.ttc", "C:\\Windows\\Fonts\\NGULIM.TTF"],
  },
  {
    key: "batang",
    label: "바탕",
    cssFamily: "Batang, serif",
    cssWeight: 400,
    files: ["C:\\Windows\\Fonts\\batang.ttc", "C:\\Windows\\Fonts\\batang.ttf"],
  },
] as const;

export type StickerFontKey = (typeof STICKER_FONT_OPTIONS)[number]["key"];

export const DEFAULT_STICKER_FONT_KEY = "jua";

export function stickerFontByKey(key: string) {
  return (
    STICKER_FONT_OPTIONS.find((item) => item.key === key) ?? STICKER_FONT_OPTIONS[0]
  );
}
