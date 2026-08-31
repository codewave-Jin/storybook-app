-- CreateEnum
CREATE TYPE "StickerPreviewStatus" AS ENUM ('IDLE', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "StickerOrder" ADD COLUMN "previewStatus" "StickerPreviewStatus" NOT NULL DEFAULT 'IDLE';
ALTER TABLE "StickerOrder" ADD COLUMN "errorReason" TEXT;

-- Existing generated previews should not re-enter the IDLE queue.
UPDATE "StickerOrder" SET "previewStatus" = 'COMPLETED' WHERE "previewImagePath" IS NOT NULL;
