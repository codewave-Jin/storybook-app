-- AlterTable
ALTER TABLE "GptImageJob" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;

-- DropIndex
DROP INDEX "GptImageJob_status_runAfter_createdAt_idx";

-- CreateIndex
CREATE INDEX "GptImageJob_status_runAfter_priority_createdAt_idx" ON "GptImageJob"("status", "runAfter", "priority", "createdAt");
