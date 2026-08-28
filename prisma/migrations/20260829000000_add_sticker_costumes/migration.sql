-- AlterTable
ALTER TABLE "StickerOrder" ADD COLUMN IF NOT EXISTS "costumeId" TEXT;

-- CreateTable
CREATE TABLE "StickerCostume" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "referenceImageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StickerCostume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateCostume" (
    "stickerTemplateId" TEXT NOT NULL,
    "costumeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TemplateCostume_pkey" PRIMARY KEY ("stickerTemplateId","costumeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "StickerCostume_key_key" ON "StickerCostume"("key");

-- CreateIndex
CREATE INDEX "TemplateCostume_costumeId_idx" ON "TemplateCostume"("costumeId");

-- CreateIndex
CREATE INDEX "StickerOrder_costumeId_idx" ON "StickerOrder"("costumeId");

-- AddForeignKey
ALTER TABLE "TemplateCostume" ADD CONSTRAINT "TemplateCostume_stickerTemplateId_fkey" FOREIGN KEY ("stickerTemplateId") REFERENCES "StickerTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateCostume" ADD CONSTRAINT "TemplateCostume_costumeId_fkey" FOREIGN KEY ("costumeId") REFERENCES "StickerCostume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_costumeId_fkey" FOREIGN KEY ("costumeId") REFERENCES "StickerCostume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
