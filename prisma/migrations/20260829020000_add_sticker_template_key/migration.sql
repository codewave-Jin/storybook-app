-- AlterTable
ALTER TABLE "StickerTemplate" ADD COLUMN IF NOT EXISTS "key" TEXT;

UPDATE "StickerTemplate" SET "key" = 'basic' WHERE "label" = '기본' AND ("key" IS NULL OR "key" = '');
UPDATE "StickerTemplate" SET "key" = 'dinosaur' WHERE "label" = '공룡옷' AND ("key" IS NULL OR "key" = '');
UPDATE "StickerTemplate" SET "key" = 'crown' WHERE "label" = '왕관복' AND ("key" IS NULL OR "key" = '');
UPDATE "StickerTemplate" SET "key" = 'first-birthday' WHERE "label" = '첫돌 답례품' AND ("key" IS NULL OR "key" = '');

UPDATE "StickerTemplate"
SET "key" = 'template-' || "id"
WHERE "key" IS NULL OR "key" = '';

ALTER TABLE "StickerTemplate" ALTER COLUMN "key" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "StickerTemplate_key_key" ON "StickerTemplate"("key");
