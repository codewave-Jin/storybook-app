-- AlterTable
ALTER TABLE "StickerOrder" ADD COLUMN IF NOT EXISTS "customCostumeHint" TEXT NOT NULL DEFAULT '';
