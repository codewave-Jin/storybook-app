-- CreateTable
CREATE TABLE "StickerTemplate" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "promptModifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StickerTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StickerPhrasePreset" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "StickerPhrasePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StickerSizeOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "widthMm" INTEGER NOT NULL,
    "heightMm" INTEGER NOT NULL,
    "quantityPerA4" INTEGER NOT NULL,

    CONSTRAINT "StickerSizeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StickerOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "sizeOptionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previewImagePath" TEXT,
    "finalImagePath" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "productionStatus" "ProductionStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StickerOrder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "StickerTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_sizeOptionId_fkey" FOREIGN KEY ("sizeOptionId") REFERENCES "StickerSizeOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
