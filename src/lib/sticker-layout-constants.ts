export const STICKER_CANVAS_SIZE = 1536;

export type StickerLayerBox = {
  leftRatio: number;
  topRatio: number;
  widthRatio: number;
  heightRatio: number;
};

export type StickerBorderTransform = {
  scale: number;
  offsetXRatio: number;
  offsetYRatio: number;
};

export type StickerTextStyle = {
  fontKey: string;
  titleScale: number;
  bodyScale: number;
};

export type StickerLayoutState = {
  character: StickerLayerBox;
  text: StickerLayerBox;
  border: StickerBorderTransform;
  textStyle: StickerTextStyle;
};

export type StickerLayerKey = "character" | "text" | "border";

export const DEFAULT_STICKER_LAYOUT: StickerLayoutState = {
  character: {
    leftRatio: -0.0106,
    topRatio: 0.0855,
    widthRatio: 0.7947,
    heightRatio: 0.7947,
  },
  text: {
    leftRatio: 0.46,
    topRatio: 0.2748,
    widthRatio: 0.5,
    heightRatio: 0.52,
  },
  border: {
    scale: 1.22,
    offsetXRatio: 0,
    offsetYRatio: 0.008,
  },
  textStyle: {
    fontKey: "malgun-bold",
    titleScale: 1,
    bodyScale: 1,
  },
};

export const STICKER_LAYOUT = DEFAULT_STICKER_LAYOUT;

function asFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function cloneStickerLayout(
  layout: StickerLayoutState = DEFAULT_STICKER_LAYOUT,
): StickerLayoutState {
  return {
    character: { ...layout.character },
    text: { ...layout.text },
    border: { ...layout.border },
    textStyle: { ...layout.textStyle },
  };
}

export function clampStickerLayout(layout: StickerLayoutState): StickerLayoutState {
  return {
    character: {
      leftRatio: clamp(layout.character.leftRatio, -0.2, 0.8),
      topRatio: clamp(layout.character.topRatio, -0.2, 0.8),
      widthRatio: clamp(layout.character.widthRatio, 0.2, 0.95),
      heightRatio: clamp(layout.character.heightRatio, 0.2, 0.95),
    },
    text: {
      leftRatio: clamp(layout.text.leftRatio, -0.15, 0.85),
      topRatio: clamp(layout.text.topRatio, -0.1, 0.8),
      widthRatio: clamp(layout.text.widthRatio, 0.18, 0.9),
      heightRatio: clamp(layout.text.heightRatio, 0.16, 0.85),
    },
    border: {
      scale: clamp(layout.border.scale, 0.7, 1.6),
      offsetXRatio: clamp(layout.border.offsetXRatio, -0.2, 0.2),
      offsetYRatio: clamp(layout.border.offsetYRatio, -0.2, 0.2),
    },
    textStyle: {
      fontKey: layout.textStyle?.fontKey || "malgun-bold",
      titleScale: clamp(layout.textStyle?.titleScale ?? 1, 0.7, 1.6),
      bodyScale: clamp(layout.textStyle?.bodyScale ?? 1, 0.7, 1.6),
    },
  };
}

export function parseStickerLayout(value: unknown): StickerLayoutState {
  if (!value || typeof value !== "object") {
    return cloneStickerLayout();
  }
  const raw = value as Record<string, Record<string, unknown>>;
  const fallback = DEFAULT_STICKER_LAYOUT;
  return clampStickerLayout({
    character: {
      leftRatio: asFiniteNumber(raw.character?.leftRatio, fallback.character.leftRatio),
      topRatio: asFiniteNumber(raw.character?.topRatio, fallback.character.topRatio),
      widthRatio: asFiniteNumber(raw.character?.widthRatio, fallback.character.widthRatio),
      heightRatio: asFiniteNumber(
        raw.character?.heightRatio,
        fallback.character.heightRatio,
      ),
    },
    text: {
      leftRatio: asFiniteNumber(raw.text?.leftRatio, fallback.text.leftRatio),
      topRatio: asFiniteNumber(raw.text?.topRatio, fallback.text.topRatio),
      widthRatio: asFiniteNumber(raw.text?.widthRatio, fallback.text.widthRatio),
      heightRatio: asFiniteNumber(raw.text?.heightRatio, fallback.text.heightRatio),
    },
    border: {
      scale: asFiniteNumber(raw.border?.scale, fallback.border.scale),
      offsetXRatio: asFiniteNumber(raw.border?.offsetXRatio, fallback.border.offsetXRatio),
      offsetYRatio: asFiniteNumber(raw.border?.offsetYRatio, fallback.border.offsetYRatio),
    },
    textStyle: {
      fontKey:
        typeof raw.textStyle?.fontKey === "string"
          ? raw.textStyle.fontKey
          : fallback.textStyle.fontKey,
      titleScale: asFiniteNumber(
        raw.textStyle?.titleScale,
        fallback.textStyle.titleScale,
      ),
      bodyScale: asFiniteNumber(raw.textStyle?.bodyScale, fallback.textStyle.bodyScale),
    },
  });
}

export function scaleLayerBox(
  box: StickerLayerBox,
  base: StickerLayerBox,
  scale: number,
): StickerLayerBox {
  const centerX = box.leftRatio + box.widthRatio / 2;
  const centerY = box.topRatio + box.heightRatio / 2;
  const widthRatio = base.widthRatio * scale;
  const heightRatio = base.heightRatio * scale;
  return {
    leftRatio: centerX - widthRatio / 2,
    topRatio: centerY - heightRatio / 2,
    widthRatio,
    heightRatio,
  };
}

export function layerBoxScale(box: StickerLayerBox, base: StickerLayerBox) {
  return box.widthRatio / base.widthRatio;
}

export function isAllowedStickerAssetPath(value: string) {
  return (
    value.startsWith("/uploads/stickers/") ||
    /^https:\/\/[\w.-]+\.blob\.vercel-storage\.com\//i.test(value)
  );
}

export function layoutsEqual(left: StickerLayoutState, right: StickerLayoutState) {
  return JSON.stringify(left) === JSON.stringify(right);
}
