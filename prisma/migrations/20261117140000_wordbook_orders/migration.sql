-- 단어 그림책: 미리보기 토큰 1개(결제 시 반환) + 결제 토큰
ALTER TYPE "TokenTransactionType" ADD VALUE IF NOT EXISTS 'WORDBOOK_PREVIEW';
ALTER TYPE "TokenTransactionType" ADD VALUE IF NOT EXISTS 'WORDBOOK_ORDER';
ALTER TYPE "TokenHoldKind" ADD VALUE IF NOT EXISTS 'WORDBOOK_PREVIEW';

CREATE TABLE "wordbook_orders" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "userId" TEXT NOT NULL,
    "characterId" TEXT,
    "baseImagePath" TEXT NOT NULL,
    "curiousImagePath" TEXT,
    "surprisedImagePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GENERATING',
    "errorReason" TEXT,
    "curiousRegenCount" INTEGER NOT NULL DEFAULT 0,
    "surprisedRegenCount" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wordbook_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wordbook_orders_userId_createdAt_idx" ON "wordbook_orders"("userId", "createdAt");

CREATE INDEX "wordbook_orders_email_idx" ON "wordbook_orders"("email");

ALTER TABLE "wordbook_orders" ADD CONSTRAINT "wordbook_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "wordbook_orders" ADD CONSTRAINT "wordbook_orders_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
