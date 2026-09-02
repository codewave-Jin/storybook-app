-- CreateEnum
CREATE TYPE "StickerBorderCategory" AS ENUM ('NONE', 'BASIC', 'FLOWER', 'LINE', 'SPECIAL');

-- CreateTable
CREATE TABLE "StickerBorder" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "category" "StickerBorderCategory" NOT NULL,
    "characterSizeRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.48,
    "offsetXRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "offsetYRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "artStyleId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StickerBorder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StickerBorder_key_key" ON "StickerBorder"("key");

-- CreateIndex
CREATE INDEX "StickerBorder_category_sortOrder_idx" ON "StickerBorder"("category", "sortOrder");

-- CreateIndex
CREATE INDEX "StickerBorder_artStyleId_idx" ON "StickerBorder"("artStyleId");

-- AddForeignKey
ALTER TABLE "StickerBorder" ADD CONSTRAINT "StickerBorder_artStyleId_fkey" FOREIGN KEY ("artStyleId") REFERENCES "ArtStyle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "StickerOrder" ALTER COLUMN "templateId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StickerOrder" ADD COLUMN "borderId" TEXT;
ALTER TABLE "StickerOrder" ADD COLUMN "characterAssetId" TEXT;
ALTER TABLE "StickerOrder" ADD COLUMN "compositeImagePath" TEXT;

-- CreateIndex
CREATE INDEX "StickerOrder_borderId_idx" ON "StickerOrder"("borderId");

-- CreateIndex
CREATE INDEX "StickerOrder_characterAssetId_idx" ON "StickerOrder"("characterAssetId");

-- AddForeignKey
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_borderId_fkey" FOREIGN KEY ("borderId") REFERENCES "StickerBorder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_characterAssetId_fkey" FOREIGN KEY ("characterAssetId") REFERENCES "CharacterAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "TemplateCostume" DROP CONSTRAINT "TemplateCostume_stickerTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "TemplateCostume" DROP CONSTRAINT "TemplateCostume_costumeId_fkey";

-- DropTable
DROP TABLE "TemplateCostume";
