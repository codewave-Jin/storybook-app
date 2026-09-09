-- AlterTable
ALTER TABLE "StorybookTemplate" ADD COLUMN IF NOT EXISTS "castRoles" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "heroAgeRange" TEXT;
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "supportingCast" JSONB NOT NULL DEFAULT '[]';

UPDATE "StorybookTemplate"
SET "castRoles" = '[{"key":"friend","label":"친구"},{"key":"mom","label":"엄마"},{"key":"dad","label":"아빠"}]'::jsonb
WHERE title = '숲속 친구들과의 하루';
