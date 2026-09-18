-- AlterTable
ALTER TABLE "Character" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Character_userId_deletedAt_idx" ON "Character"("userId", "deletedAt");
