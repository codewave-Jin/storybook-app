-- AlterTable
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "featured_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "reviews_is_featured_featured_at_idx"
  ON "reviews"("is_featured", "featured_at");
