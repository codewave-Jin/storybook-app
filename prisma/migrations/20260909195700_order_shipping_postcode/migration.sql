-- AlterTable
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "zonecode" TEXT;
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "roadAddress" TEXT;
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "detailAddress" TEXT;
ALTER TABLE "StorybookOrder" ADD COLUMN IF NOT EXISTS "sido" TEXT;

UPDATE "StorybookOrder"
SET
  "zonecode" = COALESCE("zonecode", "shippingPostalCode"),
  "roadAddress" = COALESCE("roadAddress", "shippingAddress"),
  "detailAddress" = COALESCE("detailAddress", "shippingAddressDetail")
WHERE
  "shippingPostalCode" IS NOT NULL
  OR "shippingAddress" IS NOT NULL
  OR "shippingAddressDetail" IS NOT NULL;
