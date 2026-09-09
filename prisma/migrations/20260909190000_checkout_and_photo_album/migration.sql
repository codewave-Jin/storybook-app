-- AlterTable
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "checkoutEmail" TEXT;
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "checkoutPhone" TEXT;
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "shippingName" TEXT;
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "shippingPostalCode" TEXT;
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "shippingAddress" TEXT;
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "shippingAddressDetail" TEXT;
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "includePhotoAlbum" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PhotoAlbumPage" ADD COLUMN IF NOT EXISTS "pageNumber" INTEGER;

UPDATE "PhotoAlbumPage" SET "pageNumber" = 1 WHERE "pageNumber" IS NULL;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "orderId" ORDER BY id) AS n
  FROM "PhotoAlbumPage"
)
UPDATE "PhotoAlbumPage" AS p
SET "pageNumber" = numbered.n
FROM numbered
WHERE p.id = numbered.id;

ALTER TABLE "PhotoAlbumPage" ALTER COLUMN "pageNumber" SET DEFAULT 1;
ALTER TABLE "PhotoAlbumPage" ALTER COLUMN "pageNumber" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "PhotoAlbumPage_orderId_pageNumber_key" ON "PhotoAlbumPage"("orderId", "pageNumber");
