import { createHash } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createElement } from "react";
import satori from "satori";
import sharp from "sharp";

const CACHE_DIR = process.env.VERCEL
  ? "/tmp/panbagi-watermarks"
  : path.join(process.cwd(), "storage", "cache", "watermarks");

let juaFont: Buffer | null | undefined;

function cachePath(src: string, ext: "png" | "jpg") {
  const hash = createHash("sha256").update(src).digest("hex");
  return path.join(CACHE_DIR, `${hash}.${ext}`);
}

function juaFontPath() {
  return path.join(process.cwd(), "public", "fonts", "Jua-Regular.ttf");
}

async function loadJuaFont() {
  if (juaFont !== undefined) {
    return juaFont;
  }
  const fontFile = juaFontPath();
  if (!existsSync(fontFile)) {
    juaFont = null;
    return null;
  }
  juaFont = await readFile(fontFile);
  return juaFont;
}

async function watermarkOverlay(width: number, height: number, font: Buffer) {
  const titleSize = Math.max(22, Math.round(width * 0.07));
  const urlSize = Math.max(12, Math.round(width * 0.028));
  const tileSize = Math.max(18, Math.round(width * 0.045));
  const stepX = Math.max(120, Math.round(width * 0.36));
  const stepY = Math.max(80, Math.round(height * 0.22));
  const tiles: ReturnType<typeof createElement>[] = [];

  for (let y = 0; y < height + stepY; y += stepY) {
    for (let x = 0; x < width + stepX; x += stepX) {
      tiles.push(
        createElement(
          "div",
          {
            key: `${x}-${y}`,
            style: {
              display: "flex",
              position: "absolute",
              left: x,
              top: y,
              transform: "rotate(-28deg)",
              color: "rgba(47,74,95,0.16)",
              fontSize: tileSize,
              fontFamily: "Jua",
            },
          },
          "판바기",
        ),
      );
    }
  }

  const svg = await satori(
    createElement(
      "div",
      {
        style: {
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
        },
      },
      ...tiles,
      createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            left: 0,
            right: 0,
            bottom: Math.round(height * 0.16),
            alignItems: "center",
            fontFamily: "Jua",
          },
        },
        createElement(
          "div",
          {
            style: {
              display: "flex",
              color: "rgba(47,74,95,0.4)",
              fontSize: titleSize,
            },
          },
          "판바기",
        ),
        createElement(
          "div",
          {
            style: {
              display: "flex",
              marginTop: 6,
              color: "rgba(47,74,95,0.34)",
              fontSize: urlSize,
            },
          },
          "www.panbagi.co.kr",
        ),
      ),
    ),
    {
      width,
      height,
      fonts: [{ name: "Jua", data: font, weight: 400, style: "normal" }],
    },
  );

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function readCached(cached: string, contentType: string) {
  if (!existsSync(cached)) {
    return null;
  }
  return {
    bytes: await readFile(cached),
    contentType,
  };
}

async function writeCached(cached: string, bytes: Buffer) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cached, bytes);
  } catch {
    // Vercel filesystem is read-only except /tmp.
  }
}

function originalContentType(hasAlpha: boolean | undefined) {
  return hasAlpha ? "image/png" : "image/jpeg";
}

export async function getWatermarkedPreview(src: string, original: Buffer) {
  const image = sharp(original, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const ext = meta.hasAlpha ? "png" : "jpg";
  const contentType = originalContentType(meta.hasAlpha);
  const cached = cachePath(src, ext);
  const hit = await readCached(cached, contentType);
  if (hit) {
    return hit;
  }

  try {
    const font = await loadJuaFont();
    if (!font) {
      return { bytes: original, contentType };
    }

    const width = meta.width ?? 1024;
    const height = meta.height ?? 1024;
    const overlay = await watermarkOverlay(width, height, font);
    const composed = image.composite([{ input: overlay, gravity: "northwest" }]);
    const bytes =
      ext === "png"
        ? await composed.png().toBuffer()
        : await composed.jpeg({ quality: 82 }).toBuffer();

    await writeCached(cached, bytes);
    return { bytes, contentType };
  } catch (error) {
    console.error("[watermark] falling back to original", error);
    return { bytes: original, contentType };
  }
}

export async function deleteWatermarkCache(src: string | null | undefined) {
  if (!src) {
    return;
  }

  await Promise.all(
    (["png", "jpg"] as const).map(async (ext) => {
      try {
        await unlink(cachePath(src, ext));
      } catch {
        // Cache may not exist.
      }
    }),
  );
}
