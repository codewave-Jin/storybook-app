import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";
import {
  DEFAULT_STICKER_LAYOUT,
  STICKER_CANVAS_SIZE,
  clampStickerLayout,
  type StickerLayoutState,
} from "@/lib/sticker-layout-constants";
import { stickerFontByKey } from "@/lib/sticker-fonts";
import {
  parseStickerPhrase,
  stickerPhraseLines,
} from "@/lib/sticker-phrase";

export { STICKER_LAYOUT } from "@/lib/sticker-layout-constants";

const TEXT_COLOR = "#3D2A1C";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function stickerFontFace(fontKey: string) {
  const font = stickerFontByKey(fontKey);
  const filePath = font.files.find((candidate) => existsSync(candidate));
  if (!filePath) {
    return { face: "", family: font.cssFamily, weight: font.cssWeight };
  }
  const bytes = await readFile(filePath);
  const format = path.extname(filePath).toLowerCase() === ".otf" ? "otf" : "ttf";
  return {
    face: `@font-face{font-family:'StickerKr';src:url(data:font/${format};base64,${bytes.toString("base64")}) format('${format}');}`,
    family: "StickerKr",
    weight: font.cssWeight,
  };
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

async function renderStickerTextOverlay(options: {
  width: number;
  height: number;
  phrase: string;
  layout: StickerLayoutState;
}) {
  const { title, body } = parseStickerPhrase(options.phrase);
  const box = options.layout.text;
  const left = options.width * box.leftRatio;
  const top = options.height * box.topRatio;
  const width = options.width * box.widthRatio;
  const height = options.height * box.heightRatio;
  const titleScale = options.layout.textStyle?.titleScale ?? 1;
  const bodyScale = options.layout.textStyle?.bodyScale ?? 1;
  const titleSize = Math.round(Math.min(width * 0.3, height * 0.34) * titleScale);
  const bodySize = Math.round(Math.min(width * 0.108, height * 0.12) * bodyScale);
  const crownWidth = Math.round(titleSize * 0.62);
  const crownHeight = Math.round(titleSize * 0.38);
  const crownX = left + width / 2 - crownWidth / 2;
  const crownY = top + height * 0.02;
  const titleY = crownY + crownHeight + titleSize * 0.78;
  const bodyStart = titleY + titleSize * 0.42;
  const lineHeight = bodySize * 1.42;
  const lines = stickerPhraseLines(body);
  const font = await stickerFontFace(options.layout.textStyle?.fontKey ?? "malgun-bold");
  const fontFamily = font.family;

  const bodyMarkup = lines
    .map((line, index) => {
      const y = bodyStart + index * lineHeight;
      return `<text x="${left + width / 2}" y="${y}" text-anchor="middle" font-family="${fontFamily}" font-weight="${font.weight}" font-size="${bodySize}" fill="${TEXT_COLOR}">${escapeXml(line)}</text>`;
    })
    .join("");

  const svg = `<svg width="${options.width}" height="${options.height}" xmlns="http://www.w3.org/2000/svg">
    <style>${font.face} text{font-weight:${font.weight};}</style>
    <g transform="translate(${crownX}, ${crownY})" fill="none" stroke="#E8B84A" stroke-width="${Math.max(2, titleSize * 0.045)}" stroke-linejoin="round" stroke-linecap="round">
      <path d="M${crownWidth * 0.08} ${crownHeight * 0.82} L${crownWidth * 0.18} ${crownHeight * 0.28} L${crownWidth * 0.36} ${crownHeight * 0.62} L${crownWidth * 0.5} ${crownHeight * 0.12} L${crownWidth * 0.64} ${crownHeight * 0.62} L${crownWidth * 0.82} ${crownHeight * 0.28} L${crownWidth * 0.92} ${crownHeight * 0.82}" />
    </g>
    <rect x="${crownX + crownWidth * 0.06}" y="${crownY + crownHeight * 0.78}" width="${crownWidth * 0.88}" height="${crownHeight * 0.16}" rx="2" fill="#E8B84A" />
    <text x="${left + width / 2}" y="${titleY}" text-anchor="middle" font-family="${fontFamily}" font-weight="${font.weight}" font-size="${titleSize}" fill="${TEXT_COLOR}">${escapeXml(title)}</text>
    ${bodyMarkup}
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
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

export async function compositeLayoutSticker(options: {
  borderBytes: Buffer;
  characterBytes: Buffer;
  phrase: string;
  layout?: StickerLayoutState;
}): Promise<Buffer> {
  const layout = clampStickerLayout(options.layout ?? DEFAULT_STICKER_LAYOUT);
  const size = STICKER_CANVAS_SIZE;
  const box = stickerCharacterBox(size, size, layout);
  const character = await sharp(options.characterBytes)
    .ensureAlpha()
    .resize(Math.max(1, box.width), Math.max(1, box.height), {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const [textOverlay, borderLayer, characterLayer, mask] = await Promise.all([
    renderStickerTextOverlay({
      width: size,
      height: size,
      phrase: options.phrase,
      layout,
    }),
    renderBorderLayer(options.borderBytes, size, layout),
    overlayWithinCanvas(character, box.width, box.height, box.left, box.top, size),
    circularMask(size),
  ]);

  const base = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const overlays: OverlayOptions[] = [];
  if (characterLayer) {
    overlays.push(characterLayer);
  }
  overlays.push({ input: textOverlay, left: 0, top: 0 });
  if (borderLayer) {
    overlays.push(borderLayer);
  }
  overlays.push({ input: mask, blend: "dest-in" });

  return sharp(base).composite(overlays).png().toBuffer();
}
