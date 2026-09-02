/**
 * Placement + overlay copied from scripts/test-composite.ts.
 * OFFSET_X / OFFSET_Y there were pixels; DB stores ratios of the border size.
 */
import sharp from "sharp";
import { getSupabaseAdmin } from "@/lib/supabase";
import { persistGeneratedStickerBuffer } from "@/lib/uploads";

const COMPOSITE_BUCKET = "character-assets";

export function stickerCompositePlacement(options: {
  borderWidth: number;
  borderHeight: number;
  characterSizeRatio: number;
  offsetXRatio: number;
  offsetYRatio: number;
}) {
  const canvasSide = Math.min(options.borderWidth, options.borderHeight);
  const characterSize = Math.round(canvasSide * options.characterSizeRatio);
  const offsetX = Math.round(options.offsetXRatio * options.borderWidth);
  const offsetY = Math.round(options.offsetYRatio * options.borderHeight);
  const left = Math.round((options.borderWidth - characterSize) / 2 + offsetX);
  const top = Math.round((options.borderHeight - characterSize) / 2 + offsetY);
  return { characterSize, left, top };
}

export async function compositeStickerCharacter(options: {
  borderBytes: Buffer;
  sheetBytes: Buffer;
  characterSizeRatio: number;
  offsetXRatio: number;
  offsetYRatio: number;
}): Promise<Buffer> {
  const border = sharp(options.borderBytes);
  const sheet = sharp(options.sheetBytes);
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

  const { characterSize, left, top } = stickerCompositePlacement({
    borderWidth,
    borderHeight,
    characterSizeRatio: options.characterSizeRatio,
    offsetXRatio: options.offsetXRatio,
    offsetYRatio: options.offsetYRatio,
  });

  const resizedSheet = await sharp(options.sheetBytes)
    .resize(characterSize, characterSize, {
      fit: "contain",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  return sharp(options.borderBytes)
    .composite([
      {
        input: resizedSheet,
        left,
        top,
      },
    ])
    .png()
    .toBuffer();
}

export async function persistStickerCompositeBuffer(
  buffer: Buffer,
  options: { userId: string; orderId: string },
) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return persistGeneratedStickerBuffer(buffer, "image/png");
  }

  const supabase = getSupabaseAdmin();
  const objectPath = `${options.userId}/stickers/${options.orderId}/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage
    .from(COMPOSITE_BUCKET)
    .upload(objectPath, buffer, {
      contentType: "image/png",
      upsert: false,
    });
  if (error) {
    throw new Error(`Supabase composite upload failed: ${error.message}`);
  }
  const { data } = supabase.storage
    .from(COMPOSITE_BUCKET)
    .getPublicUrl(objectPath);
  return data.publicUrl;
}
