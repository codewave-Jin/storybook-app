-- AlterTable
ALTER TABLE "PageTemplate" ADD COLUMN "expressionHint" TEXT;

-- AlterTable
ALTER TABLE "StorybookOrder" ADD COLUMN "characterAssetId" TEXT;

-- CreateTable
CREATE TABLE "CharacterAsset" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "artStyleId" TEXT NOT NULL,
    "rawPortraitUrl" TEXT,
    "styledImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterAsset_characterId_artStyleId_idx" ON "CharacterAsset"("characterId", "artStyleId");

-- CreateIndex
CREATE INDEX "CharacterAsset_artStyleId_idx" ON "CharacterAsset"("artStyleId");

-- CreateIndex
CREATE INDEX "StorybookOrder_characterAssetId_idx" ON "StorybookOrder"("characterAssetId");

-- AddForeignKey
ALTER TABLE "CharacterAsset" ADD CONSTRAINT "CharacterAsset_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAsset" ADD CONSTRAINT "CharacterAsset_artStyleId_fkey" FOREIGN KEY ("artStyleId") REFERENCES "ArtStyle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorybookOrder" ADD CONSTRAINT "StorybookOrder_characterAssetId_fkey" FOREIGN KEY ("characterAssetId") REFERENCES "CharacterAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
