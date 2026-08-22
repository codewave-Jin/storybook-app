-- AlterTable
ALTER TABLE "Character" ADD COLUMN "progressPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Character" ADD COLUMN "progressLabel" TEXT;

ALTER TABLE "Illustration" ADD COLUMN "progressPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Illustration" ADD COLUMN "progressLabel" TEXT;
