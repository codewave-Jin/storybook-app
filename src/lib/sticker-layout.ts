import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { createElement } from "react";
import satori from "satori";
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

function crownDataUri(width: number, height: number) {
  const stroke = Math.max(2, width * 0.07);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <g fill="none" stroke="#E8B84A" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round">
      <path d="M${width * 0.08} ${height * 0.82} L${width * 0.18} ${height * 0.28} L${width * 0.36} ${height * 0.62} L${width * 0.5} ${height * 0.12} L${width * 0.64} ${height * 0.62} L${width * 0.82} ${height * 0.28} L${width * 0.92} ${height * 0.82}" />
    </g>
    <rect x="${width * 0.06}" y="${height * 0.78}" width="${width * 0.88}" height="${height * 0.16}" rx="2" fill="#E8B84A" />
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
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
  const left = Math.round(options.width * box.leftRatio);
  const top = Math.round(options.height * box.topRatio);
  const width = Math.max(1, Math.round(options.width * box.widthRatio));
  const height = Math.max(1, Math.round(options.height * box.heightRatio));
  const titleScale = options.layout.textStyle?.titleScale ?? 1;
  const bodyScale = options.layout.textStyle?.bodyScale ?? 1;
  const titleSize = Math.max(
    12,
    Math.round(Math.min(width * 0.26, height * 0.28) * titleScale),
  );
  const bodySize = Math.max(
    10,
    Math.round(Math.min(width * 0.09, height * 0.1) * bodyScale),
  );
  const crownWidth = Math.max(8, Math.round(titleSize * 0.62));
  const crownHeight = Math.max(6, Math.round(titleSize * 0.38));
  const lines = stickerPhraseLines(body);
  const font = await loadStickerFont(options.layout.textStyle?.fontKey ?? "jua");

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
          justifyContent: "flex-start",
          paddingTop: Math.round(height * 0.02),
          paddingBottom: Math.round(height * 0.08),
        },
      },
      createElement("img", {
        src: crownDataUri(crownWidth, crownHeight),
        width: crownWidth,
        height: crownHeight,
      }),
      createElement(
        "div",
        {
          style: {
            display: "flex",
            width: "100%",
            justifyContent: "center",
            marginTop: Math.round(titleSize * 0.12),
            color: TEXT_COLOR,
            fontSize: titleSize,
            fontFamily: font.name,
            lineHeight: 1,
          },
        },
        title,
      ),
      ...lines.map((line, index) =>
        createElement(
          "div",
          {
            style: {
              display: "flex",
              width: "100%",
              justifyContent: "center",
              marginTop:
                index === 0
                  ? Math.round(titleSize * 0.28)
                  : Math.round(bodySize * 0.28),
              color: TEXT_COLOR,
              fontSize: bodySize,
              fontFamily: font.name,
              lineHeight: 1.2,
            },
          },
          line,
        ),
      ),
    ),
    {
      width,
      height,
      fonts: [{ name: font.name, data: font.data, weight: 400, style: "normal" }],
    },
  );

  const textPng = await sharp(Buffer.from(textSvg)).png().toBuffer();
  const canvas = await sharp({
    create: {
      width: options.width,
      height: options.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  const destLeft = Math.max(0, Math.min(left, options.width - 1));
  const destTop = Math.max(0, Math.min(top, options.height - 1));
  return sharp(canvas)
    .composite([{ input: textPng, left: destLeft, top: destTop }])
    .png()
    .toBuffer();
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
