import { createHash } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";

const CACHE_DIR = path.join(process.cwd(), "storage", "cache", "watermarks");

function cachePath(src: string, ext: "png" | "jpg") {
  const hash = createHash("sha256").update(src).digest("hex");
  return path.join(CACHE_DIR, `${hash}.${ext}`);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function watermarkSvg(width: number, height: number) {
  const titleSize = Math.max(22, Math.round(width * 0.07));
  const urlSize = Math.max(12, Math.round(width * 0.028));
  const tileSize = Math.max(18, Math.round(width * 0.045));
  const tiles: string[] = [];
  const stepX = Math.round(width * 0.36);
  const stepY = Math.round(height * 0.22);

  for (let y = -stepY; y < height + stepY; y += stepY) {
    for (let x = -stepX; x < width + stepX; x += stepX) {
      tiles.push(
        `<text x="${x}" y="${y}" fill="rgba(0,0,0,0.14)" font-size="${tileSize}" font-family="Arial, sans-serif" font-weight="700" transform="rotate(-28 ${x} ${y})">판바기</text>`,
      );
    }
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${tiles.join("")}
      <g text-anchor="middle">
        <text x="${width / 2}" y="${height * 0.78}" fill="rgba(0,0,0,0.42)" font-size="${titleSize}" font-family="Arial, sans-serif" font-weight="700">판바기</text>
        <text x="${width / 2}" y="${height * 0.78 + urlSize * 1.6}" fill="rgba(0,0,0,0.36)" font-size="${urlSize}" font-family="Arial, sans-serif" font-weight="600">${escapeXml("www.panbagi.co.kr")}</text>
      </g>
    </svg>
  `;
}

export async function getWatermarkedPreview(src: string, original: Buffer) {
  const image = sharp(original, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const ext = meta.hasAlpha ? "png" : "jpg";
  const cached = cachePath(src, ext);
  if (existsSync(cached)) {
    return {
      bytes: await readFile(cached),
      contentType: ext === "png" ? "image/png" : "image/jpeg",
    };
  }

  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;
  const svg = Buffer.from(watermarkSvg(width, height));
  const composed = image.composite([{ input: svg, gravity: "northwest" }]);
  const bytes =
    ext === "png"
      ? await composed.png().toBuffer()
      : await composed.jpeg({ quality: 82 }).toBuffer();

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cached, bytes);
  return {
    bytes,
    contentType: ext === "png" ? "image/png" : "image/jpeg",
  };
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
