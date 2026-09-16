import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { createElement } from "react";
import satori from "satori";
import sharp, { type OverlayOptions } from "sharp";
import { loadImageAsset } from "@/lib/openai-illustration";
import { stickerDecalByKey } from "@/lib/sticker-decals";
import { stickerFontByKey } from "@/lib/sticker-fonts";
import {
  DEFAULT_STICKER_LAYOUT,
  PHRASE_FONT_CANVAS_RATIO,
  STICKER_CANVAS_SIZE,
  clampStickerLayout,
  decalIdFromLayerKey,
  normalizeStack,
  phraseIdFromLayerKey,
  type StickerDecalLayer,
  type StickerLayoutState,
  type StickerPhraseLayer,
} from "@/lib/sticker-layout-constants";
import {
  parseStickerPhrases,
  stickerPhraseLines,
} from "@/lib/sticker-phrase";

export { STICKER_LAYOUT } from "@/lib/sticker-layout-constants";

const TEXT_COLOR = "#3D2A1C";
const fontCache = new Map<string, { name: string; data: Buffer }>();

function resolveFontFile(filePath: string) {
  if (path.isAbsolute(filePath) || /^[A-Za-z]:[\\/]/.test(filePath)) {
    return filePath;
  }
  return path.join(process.cwd(), filePath);
}

function isOutlineFont(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".ttf" || ext === ".otf";
}

async function loadStickerFont(fontKey: string) {
  const cached = fontCache.get(fontKey);
  if (cached) {
    return cached;
  }

  const selected = stickerFontByKey(fontKey);
  const fallback = stickerFontByKey("jua");
  for (const font of [selected, fallback]) {
    for (const candidate of font.files) {
      const filePath = resolveFontFile(candidate);
      if (!existsSync(filePath) || !isOutlineFont(filePath)) {
        continue;
      }
      const loaded = { name: "StickerKr", data: await readFile(filePath) };
      fontCache.set(fontKey, loaded);
      return loaded;
    }
  }

  throw new Error("스티커 한글 폰트 파일을 찾을 수 없습니다.");
}

export function stickerCharacterBox(
  width: number,
  height: number,
  layout: StickerLayoutState = DEFAULT_STICKER_LAYOUT,
) {
  const box = layout.character;
  return {
    left: Math.round(width * box.leftRatio),
    top: Math.round(height * box.topRatio),
    width: Math.round(width * box.widthRatio),
    height: Math.round(height * box.heightRatio),
  };
}

async function renderPhraseBox(options: {
  canvasWidth: number;
  canvasHeight: number;
  text: string;
  box: StickerLayoutState["character"];
  fontKey: string;
  scale: number;
}) {
  const lines = stickerPhraseLines(options.text);
  if (lines.length === 0) {
    return null;
  }
  const left = Math.round(options.canvasWidth * options.box.leftRatio);
  const top = Math.round(options.canvasHeight * options.box.topRatio);
  const width = Math.max(1, Math.round(options.canvasWidth * options.box.widthRatio));
  const height = Math.max(1, Math.round(options.canvasHeight * options.box.heightRatio));
  const fontSize = Math.max(
    8,
    Math.round(options.canvasWidth * PHRASE_FONT_CANVAS_RATIO * options.scale),
  );
  const font = await loadStickerFont(options.fontKey);
  const children = lines.map((line, index) =>
    createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          whiteSpace: "nowrap",
          marginTop: index === 0 ? 0 : Math.round(fontSize * 0.28),
          color: TEXT_COLOR,
          fontSize,
          fontFamily: font.name,
          lineHeight: 1.2,
        },
        key: `${index}-${line}`,
      },
      line,
    ),
  );

  const textSvg = await satori(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        },
      },
      ...children,
    ),
    {
      width,
      height,
      fonts: [{ name: font.name, data: font.data, weight: 400, style: "normal" }],
    },
  );

  const textPng = await sharp(Buffer.from(textSvg)).png().toBuffer();
  const destLeft = Math.max(0, Math.min(left, options.canvasWidth - 1));
  const destTop = Math.max(0, Math.min(top, options.canvasHeight - 1));
  return { input: textPng, left: destLeft, top: destTop };
}

function phrasesForRender(layout: StickerLayoutState, phrase: string): StickerPhraseLayer[] {
  const fallback = parseStickerPhrases(phrase);
  return layout.phrases.map((item, index) =>
    item.text.trim()
      ? item
      : { ...item, text: fallback[index] ?? "" },
  );
}

async function overlayWithinCanvas(
  overlay: Buffer,
  overlayWidth: number,
  overlayHeight: number,
  left: number,
  top: number,
  canvasSize: number,
) {
  const srcLeft = Math.max(0, -left);
  const srcTop = Math.max(0, -top);
  const destLeft = Math.max(0, left);
  const destTop = Math.max(0, top);
  const width = Math.min(overlayWidth - srcLeft, canvasSize - destLeft);
  const height = Math.min(overlayHeight - srcTop, canvasSize - destTop);
  if (width <= 0 || height <= 0) {
    return null;
  }
  const cropped = await sharp(overlay)
    .extract({
      left: srcLeft,
      top: srcTop,
      width,
      height,
    })
    .png()
    .toBuffer();
  return { input: cropped, left: destLeft, top: destTop };
}

async function renderBorderLayer(
  borderBytes: Buffer,
  size: number,
  layout: StickerLayoutState,
) {
  const scaled = Math.max(1, Math.round(size * layout.border.scale));
  const resized = await sharp(borderBytes)
    .ensureAlpha()
    .resize(scaled, scaled, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return overlayWithinCanvas(
    resized,
    scaled,
    scaled,
    Math.round((size - scaled) / 2 + size * layout.border.offsetXRatio),
    Math.round((size - scaled) / 2 + size * layout.border.offsetYRatio),
    size,
  );
}

async function circularMask(size: number) {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`;
  return Buffer.from(svg);
}

async function renderDecalLayer(
  decal: StickerDecalLayer,
  size: number,
) {
  const asset = stickerDecalByKey(decal.assetKey);
  const image = await loadImageAsset(asset.src);
  const width = Math.max(1, Math.round(size * decal.box.widthRatio));
  const height = Math.max(1, Math.round(size * decal.box.heightRatio));
  const left = Math.round(size * decal.box.leftRatio);
  const top = Math.round(size * decal.box.topRatio);
  const resized = await sharp(image.bytes)
    .ensureAlpha()
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  return overlayWithinCanvas(resized, width, height, left, top, size);
}

export async function compositeLayoutSticker(options: {
  borderBytes?: Buffer | null;
  characterBytes?: Buffer | null;
  phrase: string;
  layout?: StickerLayoutState;
  transparentCanvas?: boolean;
}): Promise<Buffer> {
  const layout = clampStickerLayout(options.layout ?? DEFAULT_STICKER_LAYOUT);
  const size = STICKER_CANVAS_SIZE;
  const box = stickerCharacterBox(size, size, layout);
  const character =
    layout.characterVisible && options.characterBytes
      ? await sharp(options.characterBytes)
          .ensureAlpha()
          .resize(Math.max(1, box.width), Math.max(1, box.height), {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer()
      : null;

  const phrases = phrasesForRender(layout, options.phrase);
  const [borderLayer, characterLayer, phraseLayers, decalLayers, mask] = await Promise.all([
    layout.borderVisible && options.borderBytes
      ? renderBorderLayer(options.borderBytes, size, layout)
      : Promise.resolve(null),
    character
      ? overlayWithinCanvas(character, box.width, box.height, box.left, box.top, size)
      : Promise.resolve(null),
    Promise.all(
      phrases.map(async (item) => ({
        id: item.id,
        overlay: await renderPhraseBox({
          canvasWidth: size,
          canvasHeight: size,
          text: item.text,
          box: item.box,
          fontKey: item.style.fontKey,
          scale: item.style.scale,
        }),
      })),
    ),
    Promise.all(
      layout.decals.map(async (decal) => ({
        id: decal.id,
        overlay: await renderDecalLayer(decal, size),
      })),
    ),
    circularMask(size),
  ]);

  const base = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: options.transparentCanvas
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const phraseById = new Map(phraseLayers.map((item) => [item.id, item.overlay]));
  const decalById = new Map(decalLayers.map((item) => [item.id, item.overlay]));
  const overlays: OverlayOptions[] = [];
  for (const key of normalizeStack(layout)) {
    if (key === "character" && characterLayer) {
      overlays.push(characterLayer);
      continue;
    }
    if (key === "border" && borderLayer) {
      overlays.push(borderLayer);
      continue;
    }
    const phraseId = phraseIdFromLayerKey(key);
    if (phraseId) {
      const overlay = phraseById.get(phraseId);
      if (overlay) {
        overlays.push(overlay);
      }
      continue;
    }
    const decalId = decalIdFromLayerKey(key);
    if (decalId) {
      const overlay = decalById.get(decalId);
      if (overlay) {
        overlays.push(overlay);
      }
    }
  }
  overlays.push({ input: mask, blend: "dest-in" });

  return sharp(base).composite(overlays).png().toBuffer();
}
