import { DEFAULT_STICKER_DECAL_KEY } from "@/lib/sticker-decals";
import { DEFAULT_STICKER_FONT_KEY } from "@/lib/sticker-fonts";
import { stickerPhraseLines } from "@/lib/sticker-phrase";

export const STICKER_CANVAS_SIZE = 1536;
export const MAX_STICKER_PHRASES = 6;
export const MAX_STICKER_DECALS = 6;

export type StickerLayerBox = {
  leftRatio: number;
  topRatio: number;
  widthRatio: number;
  heightRatio: number;
  /** Clockwise degrees. Missing values are treated as 0. */
  rotation?: number;
};

export type StickerBorderTransform = {
  scale: number;
  offsetXRatio: number;
  offsetYRatio: number;
};

export const DEFAULT_STICKER_TEXT_COLOR = "#3D2A1C";

export const STICKER_TEXT_COLORS = [
  { label: "검정", value: "#111111" },
  { label: "흰색", value: "#FFFFFF" },
  { label: "빨강", value: "#E53935" },
  { label: "주황", value: "#FB8C00" },
  { label: "노랑", value: "#FBC02D" },
  { label: "초록", value: "#43A047" },
  { label: "파랑", value: "#1E88E5" },
  { label: "보라", value: "#8E24AA" },
  { label: "분홍", value: "#EC407A" },
  { label: "갈색", value: "#3D2A1C" },
] as const;

export function stickerTextColor(value: string | null | undefined) {
  const match = STICKER_TEXT_COLORS.find(
    (item) => item.value.toLowerCase() === (value ?? "").toLowerCase(),
  );
  return match?.value ?? DEFAULT_STICKER_TEXT_COLOR;
}

export type StickerPhraseStyle = {
  fontKey: string;
  scale: number;
  color: string;
};

export type StickerPhraseLayer = {
  id: string;
  text: string;
  box: StickerLayerBox;
  style: StickerPhraseStyle;
};

export type StickerDecalLayer = {
  id: string;
  assetKey: string;
  box: StickerLayerBox;
};

export type StickerLayoutState = {
  character: StickerLayerBox;
  characterVisible: boolean;
  border: StickerBorderTransform;
  borderVisible: boolean;
  phrases: StickerPhraseLayer[];
  decals: StickerDecalLayer[];
  stack: StickerLayerKey[];
};

export type StickerLayerKey = string;

const DEFAULT_PHRASE_STYLE: StickerPhraseStyle = {
  fontKey: DEFAULT_STICKER_FONT_KEY,
  scale: 1.1,
  color: DEFAULT_STICKER_TEXT_COLOR,
};

export const DEFAULT_PHRASE_BOXES: StickerLayerBox[] = [
  { leftRatio: 0.4, topRatio: 0.12, widthRatio: 0.56, heightRatio: 0.18 },
  { leftRatio: 0.4, topRatio: 0.32, widthRatio: 0.56, heightRatio: 0.18 },
  { leftRatio: 0.4, topRatio: 0.52, widthRatio: 0.56, heightRatio: 0.18 },
  { leftRatio: 0.08, topRatio: 0.16, widthRatio: 0.34, heightRatio: 0.16 },
  { leftRatio: 0.08, topRatio: 0.4, widthRatio: 0.34, heightRatio: 0.16 },
  { leftRatio: 0.22, topRatio: 0.74, widthRatio: 0.56, heightRatio: 0.16 },
];

export const DEFAULT_DECAL_BOXES: StickerLayerBox[] = [
  { leftRatio: 0.08, topRatio: 0.18, widthRatio: 0.16, heightRatio: 0.16 },
  { leftRatio: 0.76, topRatio: 0.18, widthRatio: 0.16, heightRatio: 0.16 },
  { leftRatio: 0.08, topRatio: 0.42, widthRatio: 0.16, heightRatio: 0.16 },
  { leftRatio: 0.76, topRatio: 0.42, widthRatio: 0.16, heightRatio: 0.16 },
  { leftRatio: 0.08, topRatio: 0.68, widthRatio: 0.16, heightRatio: 0.16 },
  { leftRatio: 0.76, topRatio: 0.68, widthRatio: 0.16, heightRatio: 0.16 },
];

export const DEFAULT_DECAL_BASE = DEFAULT_DECAL_BOXES[0];

export const PHRASE_FONT_CANVAS_RATIO = 0.1;

export const DEFAULT_STICKER_LAYOUT: StickerLayoutState = {
  character: {
    leftRatio: -0.0408,
    topRatio: 0.2012,
    widthRatio: 0.6675,
    heightRatio: 0.6675,
  },
  characterVisible: true,
  border: {
    scale: 1.1102,
    offsetXRatio: -0.0026,
    offsetYRatio: 0.0288,
  },
  borderVisible: true,
  phrases: [],
  decals: [],
  stack: [],
};

export const STICKER_LAYOUT = DEFAULT_STICKER_LAYOUT;

function asFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRotation(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const wrapped = ((Math.round(value) % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

function cloneBox(box: StickerLayerBox): StickerLayerBox {
  return { ...box, rotation: normalizeRotation(box.rotation ?? 0) };
}

export function stickerPhraseBoxForText(
  text: string,
  scale: number,
  origin?: StickerLayerBox,
): StickerLayerBox {
  const lines = stickerPhraseLines(text);
  const lineCount = Math.max(lines.length, 1);
  const longest = Math.max(...lines.map((line) => Array.from(line).length), 1);
  const font = PHRASE_FONT_CANVAS_RATIO * clamp(scale, 0.5, 2.4);
  const widthRatio = clamp(longest * font * 1.15 + 0.06, 0.12, 0.92);
  const heightRatio = clamp(
    font * (lineCount * 1.2 + Math.max(0, lineCount - 1) * 0.28) + 0.05,
    0.1,
    0.92,
  );
  const cx = origin ? origin.leftRatio + origin.widthRatio / 2 : 0.68;
  const cy = origin ? origin.topRatio + origin.heightRatio / 2 : 0.42;
  return {
    leftRatio: cx - widthRatio / 2,
    topRatio: cy - heightRatio / 2,
    widthRatio,
    heightRatio,
    rotation: normalizeRotation(origin?.rotation ?? 0),
  };
}

function clonePhraseStyle(style: StickerPhraseStyle): StickerPhraseStyle {
  return { ...style };
}

function newLayerId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function phraseLayerKey(id: string) {
  return `phrase:${id}`;
}

export function decalLayerKey(id: string) {
  return `decal:${id}`;
}

export function phraseIdFromLayerKey(key: string) {
  return key.startsWith("phrase:") ? key.slice("phrase:".length) : null;
}

export function decalIdFromLayerKey(key: string) {
  return key.startsWith("decal:") ? key.slice("decal:".length) : null;
}

export function isPhraseLayerKey(key: string) {
  return key.startsWith("phrase:");
}

export function isDecalLayerKey(key: string) {
  return key.startsWith("decal:");
}

export function visibleLayerKeys(layout: {
  characterVisible: boolean;
  borderVisible: boolean;
  phrases: Array<{ id: string }>;
  decals: Array<{ id: string }>;
}): StickerLayerKey[] {
  return [
    ...(layout.characterVisible ? (["character"] as StickerLayerKey[]) : []),
    ...layout.phrases.map((item) => phraseLayerKey(item.id)),
    ...layout.decals.map((item) => decalLayerKey(item.id)),
    ...(layout.borderVisible ? (["border"] as StickerLayerKey[]) : []),
  ];
}

export function normalizeStack(layout: StickerLayoutState): StickerLayerKey[] {
  const allowed = visibleLayerKeys(layout);
  const allowedSet = new Set(allowed);
  const kept = (layout.stack ?? []).filter((key) => allowedSet.has(key));
  const keptSet = new Set(kept);
  for (const key of allowed) {
    if (!keptSet.has(key)) {
      kept.push(key);
    }
  }
  return kept;
}

export function moveStackItem(
  stack: StickerLayerKey[],
  key: StickerLayerKey,
  toIndex: number,
) {
  const from = stack.indexOf(key);
  if (from < 0) {
    return stack;
  }
  const next = stack.filter((item) => item !== key);
  const index = Math.max(0, Math.min(toIndex, next.length));
  next.splice(index, 0, key);
  return next;
}

export function createPhraseLayer(index: number, text = ""): StickerPhraseLayer {
  const fallback = DEFAULT_PHRASE_BOXES[Math.min(Math.max(index, 0), DEFAULT_PHRASE_BOXES.length - 1)];
  const style =
    index === 0
      ? { fontKey: DEFAULT_STICKER_FONT_KEY, scale: 1.5, color: DEFAULT_STICKER_TEXT_COLOR }
      : { ...DEFAULT_PHRASE_STYLE };
  return {
    id: newLayerId("phrase"),
    text,
    box: text.trim() ? stickerPhraseBoxForText(text, style.scale, fallback) : cloneBox(fallback),
    style,
  };
}

export function createDecalLayer(
  index: number,
  assetKey = DEFAULT_STICKER_DECAL_KEY,
): StickerDecalLayer {
  const box = DEFAULT_DECAL_BOXES[Math.min(Math.max(index, 0), DEFAULT_DECAL_BOXES.length - 1)];
  return {
    id: newLayerId("decal"),
    assetKey,
    box: cloneBox(box),
  };
}

export function stickerLayoutFromPhrases(texts: string[]): StickerLayoutState {
  return clampStickerLayout({
    ...cloneStickerLayout(),
    phrases: texts.slice(0, MAX_STICKER_PHRASES).map((text, index) =>
      createPhraseLayer(index, text),
    ),
  });
}

export function cloneStickerLayout(
  layout: StickerLayoutState = DEFAULT_STICKER_LAYOUT,
): StickerLayoutState {
  return {
    character: cloneBox(layout.character),
    characterVisible: layout.characterVisible !== false,
    border: { ...layout.border },
    borderVisible: layout.borderVisible !== false,
    phrases: layout.phrases.map((phrase) => ({
      id: phrase.id,
      text: phrase.text,
      box: cloneBox(phrase.box),
      style: clonePhraseStyle(phrase.style),
    })),
    decals: layout.decals.map((decal) => ({
      id: decal.id,
      assetKey: decal.assetKey,
      box: cloneBox(decal.box),
    })),
    stack: [...(layout.stack ?? [])],
  };
}

export const STICKER_CHARACTER_SCALE_MIN = 0.5;
export const STICKER_CHARACTER_SCALE_MAX = 2.5;
export const STICKER_LAYER_SCALE_MIN = 0.7;
export const STICKER_LAYER_SCALE_MAX = 1.5;
export const STICKER_DECAL_SCALE_MAX = 2.5;

function clampBox(
  box: StickerLayerBox,
  limits: { left: [number, number]; top: [number, number]; size: [number, number] },
): StickerLayerBox {
  const centerX = box.leftRatio + box.widthRatio / 2;
  const centerY = box.topRatio + box.heightRatio / 2;
  const widthRatio = clamp(box.widthRatio, limits.size[0], limits.size[1]);
  const heightRatio = clamp(box.heightRatio, limits.size[0], limits.size[1]);
  return {
    leftRatio: clamp(centerX - widthRatio / 2, limits.left[0], limits.left[1]),
    topRatio: clamp(centerY - heightRatio / 2, limits.top[0], limits.top[1]),
    widthRatio,
    heightRatio,
    rotation: normalizeRotation(box.rotation ?? 0),
  };
}

function clampPhraseStyle(style: StickerPhraseStyle): StickerPhraseStyle {
  return {
    fontKey: style.fontKey || DEFAULT_STICKER_FONT_KEY,
    scale: clamp(style.scale, 0.5, 2.4),
    color: stickerTextColor(style.color),
  };
}

const BOX_LIMITS = {
  left: [-0.15, 0.85] as [number, number],
  top: [-0.1, 0.8] as [number, number],
  size: [0.12, 0.9] as [number, number],
};

export function clampStickerLayout(layout: StickerLayoutState): StickerLayoutState {
  const next: StickerLayoutState = {
    character: clampBox(layout.character, {
      left: [-0.85, 0.95],
      top: [-0.85, 0.95],
      size: [0.15, 1.8],
    }),
    characterVisible: layout.characterVisible !== false,
    border: {
      scale: clamp(layout.border.scale, 0.7, 1.6),
      offsetXRatio: clamp(layout.border.offsetXRatio, -0.2, 0.2),
      offsetYRatio: clamp(layout.border.offsetYRatio, -0.2, 0.2),
    },
    borderVisible: layout.borderVisible !== false,
    phrases: layout.phrases.slice(0, MAX_STICKER_PHRASES).map((phrase) => ({
      id: phrase.id || newLayerId("phrase"),
      text: phrase.text ?? "",
      box: clampBox(phrase.box, BOX_LIMITS),
      style: clampPhraseStyle(phrase.style),
    })),
    decals: layout.decals.slice(0, MAX_STICKER_DECALS).map((decal) => ({
      id: decal.id || newLayerId("decal"),
      assetKey: decal.assetKey || DEFAULT_STICKER_DECAL_KEY,
      box: clampBox(decal.box, {
        left: [-0.15, 0.9],
        top: [-0.15, 0.9],
        size: [0.06, 0.5],
      }),
    })),
    stack: layout.stack ?? [],
  };
  return { ...next, stack: normalizeStack(next) };
}

function parseBox(
  raw: Record<string, unknown> | undefined,
  fallback: StickerLayerBox,
): StickerLayerBox {
  return {
    leftRatio: asFiniteNumber(raw?.leftRatio, fallback.leftRatio),
    topRatio: asFiniteNumber(raw?.topRatio, fallback.topRatio),
    widthRatio: asFiniteNumber(raw?.widthRatio, fallback.widthRatio),
    heightRatio: asFiniteNumber(raw?.heightRatio, fallback.heightRatio),
    rotation: normalizeRotation(asFiniteNumber(raw?.rotation, fallback.rotation ?? 0)),
  };
}

function parsePhraseStyle(
  raw: Record<string, unknown> | undefined,
  fallback: StickerPhraseStyle,
  legacyFontKey?: unknown,
  legacyScale?: unknown,
): StickerPhraseStyle {
  const fontKey =
    typeof raw?.fontKey === "string"
      ? raw.fontKey
      : typeof legacyFontKey === "string"
        ? legacyFontKey
        : fallback.fontKey;
  return {
    fontKey,
    scale: asFiniteNumber(raw?.scale ?? legacyScale, fallback.scale),
    color: stickerTextColor(
      typeof raw?.color === "string" ? raw.color : fallback.color,
    ),
  };
}

function parsePhraseLayer(
  raw: unknown,
  index: number,
  fallbackText = "",
): StickerPhraseLayer | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const fallback = createPhraseLayer(index, fallbackText);
  return {
    id: typeof item.id === "string" && item.id ? item.id : fallback.id,
    text: typeof item.text === "string" ? item.text : fallbackText,
    box: parseBox(item.box as Record<string, unknown> | undefined, fallback.box),
    style: parsePhraseStyle(
      item.style as Record<string, unknown> | undefined,
      fallback.style,
    ),
  };
}

function parseDecalLayer(raw: unknown, index: number): StickerDecalLayer | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const fallback = createDecalLayer(index);
  return {
    id: typeof item.id === "string" && item.id ? item.id : fallback.id,
    assetKey:
      typeof item.assetKey === "string" && item.assetKey
        ? item.assetKey
        : fallback.assetKey,
    box: parseBox(item.box as Record<string, unknown> | undefined, fallback.box),
  };
}

export function parseStickerLayout(value: unknown): StickerLayoutState {
  if (!value || typeof value !== "object") {
    return cloneStickerLayout();
  }
  const raw = value as Record<string, unknown>;
  const fallback = DEFAULT_STICKER_LAYOUT;
  const nested = raw as Record<string, Record<string, unknown>>;
  const hasPhrasesField = Array.isArray(raw.phrases);
  const decalsRaw = Array.isArray(raw.decals) ? raw.decals : null;
  const legacyTextStyle = nested.textStyle;
  const phrases = hasPhrasesField
    ? (raw.phrases as unknown[])
        .map((item, index) => parsePhraseLayer(item, index))
        .filter((item): item is StickerPhraseLayer => Boolean(item))
    : [
        {
          id: newLayerId("phrase"),
          text: "",
          box: parseBox(nested.text1 ?? nested.text, DEFAULT_PHRASE_BOXES[0]),
          style: parsePhraseStyle(
            legacyTextStyle?.phrase1 as Record<string, unknown> | undefined,
            { fontKey: DEFAULT_STICKER_FONT_KEY, scale: 1.5, color: DEFAULT_STICKER_TEXT_COLOR },
            legacyTextStyle?.fontKey,
            legacyTextStyle?.titleScale,
          ),
        },
        {
          id: newLayerId("phrase"),
          text: "",
          box: parseBox(nested.text2, DEFAULT_PHRASE_BOXES[1]),
          style: parsePhraseStyle(
            legacyTextStyle?.phrase2 as Record<string, unknown> | undefined,
            DEFAULT_PHRASE_STYLE,
            legacyTextStyle?.fontKey,
            legacyTextStyle?.bodyScale,
          ),
        },
      ];

  return clampStickerLayout({
    character: parseBox(nested.character, fallback.character),
    characterVisible: raw.characterVisible !== false,
    border: {
      scale: asFiniteNumber(nested.border?.scale, fallback.border.scale),
      offsetXRatio: asFiniteNumber(
        nested.border?.offsetXRatio,
        fallback.border.offsetXRatio,
      ),
      offsetYRatio: asFiniteNumber(
        nested.border?.offsetYRatio,
        fallback.border.offsetYRatio,
      ),
    },
    borderVisible: raw.borderVisible !== false,
    phrases,
    decals:
      decalsRaw
        ?.map((item, index) => parseDecalLayer(item, index))
        .filter((item): item is StickerDecalLayer => Boolean(item)) ?? [],
    stack: Array.isArray(raw.stack)
      ? (raw.stack as unknown[]).filter((item): item is string => typeof item === "string")
      : [],
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
    rotation: normalizeRotation(box.rotation ?? 0),
  };
}

export function layerBoxScale(box: StickerLayerBox, base: StickerLayerBox) {
  return box.widthRatio / base.widthRatio;
}

export function firstSelectableLayer(layout: StickerLayoutState): StickerLayerKey | null {
  return normalizeStack(layout)[0] ?? null;
}

export function resetStickerLayoutContent(layout: StickerLayoutState): StickerLayoutState {
  return clampStickerLayout({
    ...cloneStickerLayout(),
    phrases: layout.phrases.map((phrase, index) => ({
      ...phrase,
      box: cloneBox(DEFAULT_PHRASE_BOXES[Math.min(index, DEFAULT_PHRASE_BOXES.length - 1)]),
    })),
    decals: layout.decals.map((decal, index) => ({
      ...decal,
      box: cloneBox(DEFAULT_DECAL_BOXES[Math.min(index, DEFAULT_DECAL_BOXES.length - 1)]),
    })),
    stack: layout.stack,
  });
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
