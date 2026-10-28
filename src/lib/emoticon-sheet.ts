import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { createElement } from "react";
import satori from "satori";
import sharp from "sharp";
import {
  EMOTICON_CELLS,
  EMOTICON_COLUMNS,
  EMOTICON_ROWS,
} from "@/lib/emoticon-prompt";
import { stickerFontByKey } from "@/lib/sticker-fonts";

export type EmoticonCellRect = {
  key: string;
  caption: string;
  index: number;
  column: number;
  row: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

const fontCache = new Map<string, { name: string; data: Buffer }>();

function resolveFontFile(filePath: string) {
  if (path.isAbsolute(filePath) || /^[A-Za-z]:[\\/]/.test(filePath)) {
    return filePath;
  }
  return path.join(process.cwd(), filePath);
}

export function emoticonCellRects(width: number, height: number): EmoticonCellRect[] {
  const cellWidth = Math.floor(width / EMOTICON_COLUMNS);
  const cellHeight = Math.floor(height / EMOTICON_ROWS);
  return EMOTICON_CELLS.map((cell, index) => {
    const column = index % EMOTICON_COLUMNS;
    const row = Math.floor(index / EMOTICON_COLUMNS);
    const left = column * cellWidth;
    const top = row * cellHeight;
    return {
      key: cell.key,
      caption: cell.caption,
      index,
      column,
      row,
      left,
      top,
      width: column === EMOTICON_COLUMNS - 1 ? width - left : cellWidth,
      height: row === EMOTICON_ROWS - 1 ? height - top : cellHeight,
    };
  });
}

async function loadCaptionFont() {
  const cached = fontCache.get("jua");
  if (cached) {
    return cached;
  }
  const font = stickerFontByKey("jua");
  for (const candidate of font.files) {
    const filePath = resolveFontFile(candidate);
    if (!existsSync(filePath)) {
      continue;
    }
    const loaded = { name: "Jua", data: await readFile(filePath) };
    fontCache.set("jua", loaded);
    return loaded;
  }
  throw new Error("이모티콘 문구 폰트를 찾을 수 없습니다.");
}

async function renderCaption(
  text: string,
  width: number,
  height: number,
  font: { name: string; data: Buffer },
) {
  const fontSize = Math.max(18, Math.round(height * 0.58));
  const svg = await satori(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#ffffff",
            color: "#3D2A1C",
            border: "2px solid #E7D3C3",
            borderRadius: 999,
            paddingLeft: Math.round(fontSize * 0.45),
            paddingRight: Math.round(fontSize * 0.45),
            fontFamily: font.name,
            fontSize,
            lineHeight: 1,
          },
        },
        text,
      ),
    ),
    {
      width,
      height,
      fonts: [{ name: font.name, data: font.data, weight: 400, style: "normal" }],
    },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function compositeEmoticonCaptions(input: Buffer) {
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < EMOTICON_COLUMNS || height < EMOTICON_ROWS) {
    throw new Error("생성된 이미지 크기를 확인할 수 없습니다.");
  }

  const base = await sharp(input)
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
  const font = await loadCaptionFont();
  const overlays = await Promise.all(
    emoticonCellRects(width, height).map(async (cell) => {
      const captionWidth = Math.max(48, Math.round(cell.width * 0.86));
      const captionHeight = Math.max(36, Math.round(cell.height * 0.16));
      const caption = await renderCaption(cell.caption, captionWidth, captionHeight, font);
      return {
        input: caption,
        left: cell.left + Math.round((cell.width - captionWidth) / 2),
        top: cell.top + Math.round(cell.height * 0.035),
      };
    }),
  );

  return sharp(base).composite(overlays).png().toBuffer();
}

export async function splitEmoticonCells(input: Buffer) {
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const cells = emoticonCellRects(width, height);
  return Promise.all(
    cells.map(async (cell) => {
      return sharp(input)
        .extract({
          left: cell.left,
          top: cell.top,
          width: cell.width,
          height: cell.height,
        })
        .png()
        .toBuffer();
    }),
  );
}
