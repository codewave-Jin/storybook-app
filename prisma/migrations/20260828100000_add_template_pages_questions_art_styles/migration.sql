-- AlterTable
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "artStyleId" TEXT;

-- CreateTable
CREATE TABLE "PageTemplate" (
    "id" TEXT NOT NULL,
    "storybookTemplateId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "pageType" "IllustrationPageType" NOT NULL DEFAULT 'PAGE',
    "promptTemplate" TEXT NOT NULL,
    "characterSlots" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateQuestion" (
    "id" TEXT NOT NULL,
    "storybookTemplateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "answerType" TEXT NOT NULL DEFAULT 'text',
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtStyle" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtStyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateArtStyle" (
    "storybookTemplateId" TEXT NOT NULL,
    "artStyleId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TemplateArtStyle_pkey" PRIMARY KEY ("storybookTemplateId","artStyleId")
);

-- CreateIndex
CREATE INDEX "PageTemplate_storybookTemplateId_idx" ON "PageTemplate"("storybookTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "PageTemplate_storybookTemplateId_pageNumber_key" ON "PageTemplate"("storybookTemplateId", "pageNumber");

-- CreateIndex
CREATE INDEX "TemplateQuestion_storybookTemplateId_sortOrder_idx" ON "TemplateQuestion"("storybookTemplateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateQuestion_storybookTemplateId_key_key" ON "TemplateQuestion"("storybookTemplateId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ArtStyle_key_key" ON "ArtStyle"("key");

-- CreateIndex
CREATE INDEX "TemplateArtStyle_artStyleId_idx" ON "TemplateArtStyle"("artStyleId");

-- CreateIndex
CREATE INDEX "StorybookOrder_artStyleId_idx" ON "StorybookOrder"("artStyleId");

-- AddForeignKey
ALTER TABLE "PageTemplate" ADD CONSTRAINT "PageTemplate_storybookTemplateId_fkey" FOREIGN KEY ("storybookTemplateId") REFERENCES "StorybookTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateQuestion" ADD CONSTRAINT "TemplateQuestion_storybookTemplateId_fkey" FOREIGN KEY ("storybookTemplateId") REFERENCES "StorybookTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateArtStyle" ADD CONSTRAINT "TemplateArtStyle_storybookTemplateId_fkey" FOREIGN KEY ("storybookTemplateId") REFERENCES "StorybookTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateArtStyle" ADD CONSTRAINT "TemplateArtStyle_artStyleId_fkey" FOREIGN KEY ("artStyleId") REFERENCES "ArtStyle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorybookOrder" ADD CONSTRAINT "StorybookOrder_artStyleId_fkey" FOREIGN KEY ("artStyleId") REFERENCES "ArtStyle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill TemplateQuestion from legacy StorybookTemplate.customFields JSON
INSERT INTO "TemplateQuestion" (
  "id",
  "storybookTemplateId",
  "key",
  "label",
  "answerType",
  "placeholder",
  "required",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(t.id || ':' || (field->>'key')) AS "id",
  t.id AS "storybookTemplateId",
  field->>'key' AS "key",
  COALESCE(field->>'label', field->>'key') AS "label",
  COALESCE(NULLIF(field->>'type', ''), 'text') AS "answerType",
  NULLIF(field->>'placeholder', '') AS "placeholder",
  true AS "required",
  (ord.ordinality - 1)::int AS "sortOrder",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "StorybookTemplate" t
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(t."customFields"::jsonb) = 'array' THEN t."customFields"::jsonb
    ELSE '[]'::jsonb
  END
) WITH ORDINALITY AS ord(field, ordinality)
WHERE COALESCE(field->>'key', '') <> ''
ON CONFLICT ("storybookTemplateId", "key") DO NOTHING;
