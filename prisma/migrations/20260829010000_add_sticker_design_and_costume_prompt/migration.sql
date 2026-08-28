-- AlterTable
ALTER TABLE "StickerTemplate" ADD COLUMN IF NOT EXISTS "designReferenceImageUrl" TEXT;

-- AlterTable
ALTER TABLE "StickerCostume" ADD COLUMN IF NOT EXISTS "promptHint" TEXT NOT NULL DEFAULT '';
