-- DropForeignKey
ALTER TABLE "StickerBorder" DROP CONSTRAINT "StickerBorder_artStyleId_fkey";

-- DropForeignKey
ALTER TABLE "StickerOrder" DROP CONSTRAINT "StickerOrder_characterAssetId_fkey";

-- DropIndex
DROP INDEX "StickerBorder_artStyleId_idx";

-- DropIndex
DROP INDEX "StickerOrder_characterAssetId_idx";

-- AlterTable
ALTER TABLE "StickerBorder" DROP COLUMN "artStyleId";

-- AlterTable
ALTER TABLE "StickerOrder" DROP COLUMN "characterAssetId";
