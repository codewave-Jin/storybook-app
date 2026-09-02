-- CreateTable
CREATE TABLE "GptImageJob" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "inputImages" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GptImageJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GptImageUsage" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "inputImages" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GptImageUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GptImageJob_status_runAfter_createdAt_idx" ON "GptImageJob"("status", "runAfter", "createdAt");

-- CreateIndex
CREATE INDEX "GptImageJob_kind_targetId_status_idx" ON "GptImageJob"("kind", "targetId", "status");

-- CreateIndex
CREATE INDEX "GptImageUsage_startedAt_idx" ON "GptImageUsage"("startedAt");

-- CreateIndex
CREATE INDEX "GptImageUsage_jobId_idx" ON "GptImageUsage"("jobId");

-- AddForeignKey
ALTER TABLE "GptImageUsage" ADD CONSTRAINT "GptImageUsage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GptImageJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
