/**
 * Composite a styled character sheet onto the circular sticker border.
 *
 * Output is the single GPT input image for the new sticker flow.
 *
 * Usage (from storybook-app):
 *   npx tsx scripts/test-composite.ts
 *
 * Inputs:
 *   scripts/test-assets/sticker-border.png
 *   scripts/test-assets/character-sheet.png
 *
 * Output:
 *   scripts/test-output/composite-{timestamp}.png
 *
 * Tune placement with the constants below. The character sheet is opaque
 * (cream square), so keep the resized square inside the floral ring or the
 * corners will cover the flowers.
 */
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

/** Character width/height as a fraction of the border image's shorter side. */
const CHARACTER_SIZE_RATIO = 0.48;

/** Pixel offset from center. +X is right, +Y is down. */
const OFFSET_X = 0;
const OFFSET_Y = 0;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(SCRIPT_DIR, "test-assets");
const OUTPUT_DIR = path.join(SCRIPT_DIR, "test-output");
const BORDER_PATH = path.join(ASSETS_DIR, "sticker-border.png");
const SHEET_PATH = path.join(ASSETS_DIR, "character-sheet.png");

function timestampForFilename(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function formatRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(width, height);
  return `${width / d}:${height / d} (${(width / height).toFixed(3)})`;
}

function requireFile(filePath: string, label: string) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

async function main() {
  requireFile(BORDER_PATH, "Border image");
  requireFile(SHEET_PATH, "Character sheet");

  const border = sharp(BORDER_PATH);
  const sheet = sharp(SHEET_PATH);
  const [borderMeta, sheetMeta] = await Promise.all([
    border.metadata(),
    sheet.metadata(),
  ]);

  const borderWidth = borderMeta.width ?? 0;
  const borderHeight = borderMeta.height ?? 0;
  const sheetWidth = sheetMeta.width ?? 0;
  const sheetHeight = sheetMeta.height ?? 0;
  if (!borderWidth || !borderHeight || !sheetWidth || !sheetHeight) {
    throw new Error("Could not read image dimensions");
  }

  const canvasSide = Math.min(borderWidth, borderHeight);
  const characterSize = Math.round(canvasSide * CHARACTER_SIZE_RATIO);
  const left = Math.round((borderWidth - characterSize) / 2 + OFFSET_X);
  const top = Math.round((borderHeight - characterSize) / 2 + OFFSET_Y);

  const innerCircleEstimate = Math.round(canvasSide * 0.74);
  const squareDiagonal = Math.round(characterSize * Math.SQRT2);
  const squareFitsInRing = squareDiagonal <= innerCircleEstimate;

  console.log("=== Source images ===");
  console.log(
    `border:  ${borderWidth}x${borderHeight}  ratio=${formatRatio(borderWidth, borderHeight)}  ${BORDER_PATH}`,
  );
  console.log(
    `sheet:   ${sheetWidth}x${sheetHeight}  ratio=${formatRatio(sheetWidth, sheetHeight)}  ${SHEET_PATH}`,
  );
  console.log("");
  console.log("=== Placement ===");
  console.log(`CHARACTER_SIZE_RATIO=${CHARACTER_SIZE_RATIO}`);
  console.log(`OFFSET_X=${OFFSET_X}  OFFSET_Y=${OFFSET_Y}`);
  console.log(`character size=${characterSize}x${characterSize}px`);
  console.log(`composite left=${left} top=${top}`);
  console.log(
    `inner wreath ~${innerCircleEstimate}px diameter; character square diagonal=${squareDiagonal}px (${squareFitsInRing ? "inside ring" : "may overlap flowers"})`,
  );

  const resizedSheet = await sharp(SHEET_PATH)
    .resize(characterSize, characterSize, {
      fit: "contain",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(
    OUTPUT_DIR,
    `composite-${timestampForFilename()}.png`,
  );

  await sharp(BORDER_PATH)
    .composite([
      {
        input: resizedSheet,
        left,
        top,
      },
    ])
    .png()
    .toFile(outPath);

  console.log("");
  console.log(`Saved: ${outPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
