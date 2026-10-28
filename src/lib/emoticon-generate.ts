import { prisma } from "@/lib/prisma";
import { generateStickerImage } from "@/lib/sticker-openai";
import {
  EMOTICON_CELLS,
  buildEmoticonSheetPrompt,
  type EmoticonAgeUnit,
} from "@/lib/emoticon-prompt";
import { compositeEmoticonCaptions, splitEmoticonCells } from "@/lib/emoticon-sheet";
import { persistGeneratedStickerBuffer } from "@/lib/uploads";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_REFERENCE_BYTES = 5 * 1024 * 1024;

export function emoticonReferenceError(file: { type: string; size: number }) {
  if (!ALLOWED_MIME.has(file.type)) {
    return "JPG, PNG, WEBP 이미지만 올릴 수 있습니다.";
  }
  if (file.size > MAX_REFERENCE_BYTES) {
    return "이미지 크기는 5MB 이하여야 합니다.";
  }
  return null;
}

function looksLikeImage(buffer: Buffer) {
  if (buffer.length < 12) {
    return false;
  }
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const png =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const webp =
    buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return jpeg || png || webp;
}

export type EmoticonPreviewCell = {
  key: string;
  caption: string;
  imageUrl: string;
};

export function emoticonPreviewCells(cellImagePaths: string[]): EmoticonPreviewCell[] {
  return EMOTICON_CELLS.map((cell, index) => ({
    key: cell.key,
    caption: cell.caption,
    imageUrl: cellImagePaths[index] ?? "",
  })).filter((cell) => cell.imageUrl);
}

export async function generateEmoticonSheet(input: {
  imageBytes: Buffer;
  imageMime: string;
  age: number | null;
  ageUnit: EmoticonAgeUnit | null;
  userId: string;
  email?: string | null;
}) {
  if (!looksLikeImage(input.imageBytes)) {
    throw new Error("이미지 파일이 아닙니다.");
  }

  const prompt = buildEmoticonSheetPrompt({
    age: input.age,
    ageUnit: input.ageUnit,
  });
  const generated = await generateStickerImage({
    prompt,
    imageBytes: input.imageBytes,
    imageMime: input.imageMime,
    outputFormat: "png",
    quality: "high",
    background: "opaque",
  });
  const sheet = await compositeEmoticonCaptions(Buffer.from(generated.b64, "base64"));
  const pieces = await splitEmoticonCells(sheet);
  const sheetImagePath = await persistGeneratedStickerBuffer(sheet, "image/png", input.userId);
  const cellImagePaths: string[] = [];
  for (const piece of pieces) {
    cellImagePaths.push(
      await persistGeneratedStickerBuffer(piece, "image/png", input.userId),
    );
  }
  const order = await prisma.emoticonOrder.create({
    data: {
      userId: input.userId,
      email: input.email ?? null,
      sheetImagePath,
      cellImagePaths,
      age: input.age,
      ageUnit: input.ageUnit,
      paymentStatus: "PENDING",
    },
  });
  return {
    orderId: order.id,
    paid: false,
    cells: emoticonPreviewCells(cellImagePaths),
  };
}
