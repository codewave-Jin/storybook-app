-- AlterEnum
ALTER TYPE "TokenTransactionType" ADD VALUE IF NOT EXISTS 'SIGNUP_GRANT';
ALTER TYPE "TokenTransactionType" ADD VALUE IF NOT EXISTS 'STORYBOOK_PREVIEW';
ALTER TYPE "TokenTransactionType" ADD VALUE IF NOT EXISTS 'STICKER_SPECIAL';
ALTER TYPE "TokenTransactionType" ADD VALUE IF NOT EXISTS 'REFUND';

-- CreateEnum
CREATE TYPE "TokenHoldKind" AS ENUM ('STORYBOOK_PREVIEW', 'STICKER_SPECIAL');

-- CreateTable
CREATE TABLE "TokenHold" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "TokenHoldKind" NOT NULL,
    "spendSource" TEXT NOT NULL,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenHold_userId_kind_refunded_idx" ON "TokenHold"("userId", "kind", "refunded");

-- CreateIndex
CREATE INDEX "TokenHold_orderId_idx" ON "TokenHold"("orderId");

-- AddForeignKey
ALTER TABLE "TokenHold" ADD CONSTRAINT "TokenHold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
