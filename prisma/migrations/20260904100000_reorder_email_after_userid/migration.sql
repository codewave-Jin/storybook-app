-- Postgres cannot INSERT a column in the middle. Rebuild tables so email
-- sits immediately after userId / user_id for Table Editor.

-- TokenBalance
CREATE TABLE "TokenBalance_new" AS
SELECT "id", "userId", "email", "freeBalance", "paidBalance", "lastFreeGrantDate"
FROM "TokenBalance";

ALTER TABLE "TokenBalance_new" ADD CONSTRAINT "TokenBalance_new_pkey" PRIMARY KEY ("id");
ALTER TABLE "TokenBalance_new" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "TokenBalance_new" ALTER COLUMN "freeBalance" SET NOT NULL;
ALTER TABLE "TokenBalance_new" ALTER COLUMN "freeBalance" SET DEFAULT 0;
ALTER TABLE "TokenBalance_new" ALTER COLUMN "paidBalance" SET NOT NULL;
ALTER TABLE "TokenBalance_new" ALTER COLUMN "paidBalance" SET DEFAULT 0;

DROP TRIGGER IF EXISTS token_balance_sync_email ON "TokenBalance";
ALTER TABLE "TokenBalance" DROP CONSTRAINT "TokenBalance_userId_fkey";
DROP INDEX IF EXISTS "TokenBalance_userId_key";
DROP INDEX IF EXISTS "TokenBalance_email_idx";
ALTER TABLE "TokenBalance" DROP CONSTRAINT "TokenBalance_pkey";
DROP TABLE "TokenBalance";
ALTER TABLE "TokenBalance_new" RENAME TO "TokenBalance";
ALTER TABLE "TokenBalance" RENAME CONSTRAINT "TokenBalance_new_pkey" TO "TokenBalance_pkey";
CREATE UNIQUE INDEX "TokenBalance_userId_key" ON "TokenBalance"("userId");
CREATE INDEX "TokenBalance_email_idx" ON "TokenBalance"("email");
ALTER TABLE "TokenBalance" ADD CONSTRAINT "TokenBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER token_balance_sync_email
BEFORE INSERT OR UPDATE ON "TokenBalance"
FOR EACH ROW
EXECUTE FUNCTION sync_token_balance_email();

-- TokenTransaction
CREATE TABLE "TokenTransaction_new" AS
SELECT "id", "userId", "email", "amount", "type", "createdAt"
FROM "TokenTransaction";

ALTER TABLE "TokenTransaction_new" ADD CONSTRAINT "TokenTransaction_new_pkey" PRIMARY KEY ("id");
ALTER TABLE "TokenTransaction_new" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "TokenTransaction_new" ALTER COLUMN "amount" SET NOT NULL;
ALTER TABLE "TokenTransaction_new" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "TokenTransaction_new" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "TokenTransaction_new" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS token_transaction_sync_email ON "TokenTransaction";
ALTER TABLE "TokenTransaction" DROP CONSTRAINT "TokenTransaction_userId_fkey";
DROP INDEX IF EXISTS "TokenTransaction_email_idx";
ALTER TABLE "TokenTransaction" DROP CONSTRAINT "TokenTransaction_pkey";
DROP TABLE "TokenTransaction";
ALTER TABLE "TokenTransaction_new" RENAME TO "TokenTransaction";
ALTER TABLE "TokenTransaction" RENAME CONSTRAINT "TokenTransaction_new_pkey" TO "TokenTransaction_pkey";
CREATE INDEX "TokenTransaction_email_idx" ON "TokenTransaction"("email");
ALTER TABLE "TokenTransaction" ADD CONSTRAINT "TokenTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER token_transaction_sync_email
BEFORE INSERT OR UPDATE ON "TokenTransaction"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_user_id_camel();

-- generation_events
CREATE TABLE "generation_events_new" AS
SELECT "id", "kind", "entity_id", "order_id", "user_id", "email", "step", "message", "detail", "created_at"
FROM "generation_events";

ALTER TABLE "generation_events_new" ADD CONSTRAINT "generation_events_new_pkey" PRIMARY KEY ("id");
ALTER TABLE "generation_events_new" ALTER COLUMN "kind" SET NOT NULL;
ALTER TABLE "generation_events_new" ALTER COLUMN "entity_id" SET NOT NULL;
ALTER TABLE "generation_events_new" ALTER COLUMN "step" SET NOT NULL;
ALTER TABLE "generation_events_new" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "generation_events_new" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS generation_events_sync_email ON "generation_events";
DROP INDEX IF EXISTS "generation_events_entity_id_created_at_idx";
DROP INDEX IF EXISTS "generation_events_order_id_created_at_idx";
DROP INDEX IF EXISTS "generation_events_kind_created_at_idx";
DROP INDEX IF EXISTS "generation_events_email_idx";
ALTER TABLE "generation_events" DROP CONSTRAINT "generation_events_pkey";
DROP TABLE "generation_events";
ALTER TABLE "generation_events_new" RENAME TO "generation_events";
ALTER TABLE "generation_events" RENAME CONSTRAINT "generation_events_new_pkey" TO "generation_events_pkey";
CREATE INDEX "generation_events_entity_id_created_at_idx" ON "generation_events"("entity_id", "created_at");
CREATE INDEX "generation_events_order_id_created_at_idx" ON "generation_events"("order_id", "created_at");
CREATE INDEX "generation_events_kind_created_at_idx" ON "generation_events"("kind", "created_at");
CREATE INDEX "generation_events_email_idx" ON "generation_events"("email");
CREATE TRIGGER generation_events_sync_email
BEFORE INSERT OR UPDATE ON "generation_events"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_user_id_snake();

-- Character
ALTER TABLE "CharacterAsset" DROP CONSTRAINT "CharacterAsset_characterId_fkey";
ALTER TABLE "StickerOrder" DROP CONSTRAINT "StickerOrder_characterId_fkey";

CREATE TABLE "Character_new" AS
SELECT "id", "userId", "email", "label", "gender", "originalPhotoPath", "generatedImagePath", "seed", "status", "progressPercent", "progressLabel", "createdAt"
FROM "Character";

ALTER TABLE "Character_new" ADD CONSTRAINT "Character_new_pkey" PRIMARY KEY ("id");
ALTER TABLE "Character_new" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Character_new" ALTER COLUMN "label" SET NOT NULL;
ALTER TABLE "Character_new" ALTER COLUMN "gender" SET NOT NULL;
ALTER TABLE "Character_new" ALTER COLUMN "originalPhotoPath" SET NOT NULL;
ALTER TABLE "Character_new" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Character_new" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "Character_new" ALTER COLUMN "progressPercent" SET NOT NULL;
ALTER TABLE "Character_new" ALTER COLUMN "progressPercent" SET DEFAULT 0;
ALTER TABLE "Character_new" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "Character_new" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS character_sync_email ON "Character";
ALTER TABLE "Character" DROP CONSTRAINT "Character_userId_fkey";
DROP INDEX IF EXISTS "Character_email_idx";
ALTER TABLE "Character" DROP CONSTRAINT "Character_pkey";
DROP TABLE "Character";
ALTER TABLE "Character_new" RENAME TO "Character";
ALTER TABLE "Character" RENAME CONSTRAINT "Character_new_pkey" TO "Character_pkey";
CREATE INDEX "Character_email_idx" ON "Character"("email");
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CharacterAsset" ADD CONSTRAINT "CharacterAsset_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER character_sync_email
BEFORE INSERT OR UPDATE ON "Character"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_user_id_camel();

-- StorybookOrder
ALTER TABLE "Illustration" DROP CONSTRAINT "Illustration_orderId_fkey";
ALTER TABLE "PhotoAlbumPage" DROP CONSTRAINT "PhotoAlbumPage_orderId_fkey";
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_storybook_order_id_fkey";
ALTER TABLE "order_status_logs" DROP CONSTRAINT "order_status_logs_order_id_fkey";

CREATE TABLE "StorybookOrder_new" AS
SELECT "id", "userId", "email", "templateId", "selectedCharacterIds", "customInputValues", "artStyleId", "characterAssetId", "paymentStatus", "productionStatus", "fulfillmentStatus", "expectedDeliveryAt", "shippingCarrier", "trackingNumber", "previewGeneratedAt", "createdAt"
FROM "StorybookOrder";

ALTER TABLE "StorybookOrder_new" ADD CONSTRAINT "StorybookOrder_new_pkey" PRIMARY KEY ("id");
ALTER TABLE "StorybookOrder_new" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "StorybookOrder_new" ALTER COLUMN "templateId" SET NOT NULL;
ALTER TABLE "StorybookOrder_new" ALTER COLUMN "selectedCharacterIds" SET NOT NULL;
ALTER TABLE "StorybookOrder_new" ALTER COLUMN "customInputValues" SET NOT NULL;
ALTER TABLE "StorybookOrder_new" ALTER COLUMN "paymentStatus" SET NOT NULL;
ALTER TABLE "StorybookOrder_new" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';
ALTER TABLE "StorybookOrder_new" ALTER COLUMN "productionStatus" SET NOT NULL;
ALTER TABLE "StorybookOrder_new" ALTER COLUMN "productionStatus" SET DEFAULT 'WAITING';
ALTER TABLE "StorybookOrder_new" ALTER COLUMN "fulfillmentStatus" SET NOT NULL;
ALTER TABLE "StorybookOrder_new" ALTER COLUMN "fulfillmentStatus" SET DEFAULT 'PREPARING';
ALTER TABLE "StorybookOrder_new" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "StorybookOrder_new" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS storybook_order_sync_email ON "StorybookOrder";
ALTER TABLE "StorybookOrder" DROP CONSTRAINT "StorybookOrder_userId_fkey";
ALTER TABLE "StorybookOrder" DROP CONSTRAINT "StorybookOrder_templateId_fkey";
ALTER TABLE "StorybookOrder" DROP CONSTRAINT "StorybookOrder_artStyleId_fkey";
ALTER TABLE "StorybookOrder" DROP CONSTRAINT "StorybookOrder_characterAssetId_fkey";
DROP INDEX IF EXISTS "StorybookOrder_artStyleId_idx";
DROP INDEX IF EXISTS "StorybookOrder_characterAssetId_idx";
DROP INDEX IF EXISTS "StorybookOrder_email_idx";
ALTER TABLE "StorybookOrder" DROP CONSTRAINT "StorybookOrder_pkey";
DROP TABLE "StorybookOrder";
ALTER TABLE "StorybookOrder_new" RENAME TO "StorybookOrder";
ALTER TABLE "StorybookOrder" RENAME CONSTRAINT "StorybookOrder_new_pkey" TO "StorybookOrder_pkey";
CREATE INDEX "StorybookOrder_artStyleId_idx" ON "StorybookOrder"("artStyleId");
CREATE INDEX "StorybookOrder_characterAssetId_idx" ON "StorybookOrder"("characterAssetId");
CREATE INDEX "StorybookOrder_email_idx" ON "StorybookOrder"("email");
ALTER TABLE "StorybookOrder" ADD CONSTRAINT "StorybookOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StorybookOrder" ADD CONSTRAINT "StorybookOrder_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "StorybookTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StorybookOrder" ADD CONSTRAINT "StorybookOrder_artStyleId_fkey" FOREIGN KEY ("artStyleId") REFERENCES "ArtStyle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StorybookOrder" ADD CONSTRAINT "StorybookOrder_characterAssetId_fkey" FOREIGN KEY ("characterAssetId") REFERENCES "CharacterAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Illustration" ADD CONSTRAINT "Illustration_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StorybookOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PhotoAlbumPage" ADD CONSTRAINT "PhotoAlbumPage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StorybookOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_storybook_order_id_fkey" FOREIGN KEY ("storybook_order_id") REFERENCES "StorybookOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_status_logs" ADD CONSTRAINT "order_status_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "StorybookOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TRIGGER storybook_order_sync_email
BEFORE INSERT OR UPDATE ON "StorybookOrder"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_user_id_camel();

-- StickerOrder
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_sticker_order_id_fkey";

CREATE TABLE "StickerOrder_new" AS
SELECT "id", "userId", "email", "characterId", "templateId", "borderId", "costumeId", "customCostumeHint", "phrase", "sizeOptionId", "quantity", "previewImagePath", "finalImagePath", "compositeImagePath", "previewStatus", "errorReason", "paymentStatus", "productionStatus", "createdAt"
FROM "StickerOrder";

ALTER TABLE "StickerOrder_new" ADD CONSTRAINT "StickerOrder_new_pkey" PRIMARY KEY ("id");
ALTER TABLE "StickerOrder_new" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "StickerOrder_new" ALTER COLUMN "characterId" SET NOT NULL;
ALTER TABLE "StickerOrder_new" ALTER COLUMN "customCostumeHint" SET NOT NULL;
ALTER TABLE "StickerOrder_new" ALTER COLUMN "customCostumeHint" SET DEFAULT '';
ALTER TABLE "StickerOrder_new" ALTER COLUMN "phrase" SET NOT NULL;
ALTER TABLE "StickerOrder_new" ALTER COLUMN "sizeOptionId" SET NOT NULL;
ALTER TABLE "StickerOrder_new" ALTER COLUMN "quantity" SET NOT NULL;
ALTER TABLE "StickerOrder_new" ALTER COLUMN "previewStatus" SET NOT NULL;
ALTER TABLE "StickerOrder_new" ALTER COLUMN "previewStatus" SET DEFAULT 'IDLE';
ALTER TABLE "StickerOrder_new" ALTER COLUMN "paymentStatus" SET NOT NULL;
ALTER TABLE "StickerOrder_new" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';
ALTER TABLE "StickerOrder_new" ALTER COLUMN "productionStatus" SET NOT NULL;
ALTER TABLE "StickerOrder_new" ALTER COLUMN "productionStatus" SET DEFAULT 'WAITING';
ALTER TABLE "StickerOrder_new" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "StickerOrder_new" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS sticker_order_sync_email ON "StickerOrder";
ALTER TABLE "StickerOrder" DROP CONSTRAINT "StickerOrder_userId_fkey";
ALTER TABLE "StickerOrder" DROP CONSTRAINT "StickerOrder_characterId_fkey";
ALTER TABLE "StickerOrder" DROP CONSTRAINT IF EXISTS "StickerOrder_templateId_fkey";
ALTER TABLE "StickerOrder" DROP CONSTRAINT "StickerOrder_borderId_fkey";
ALTER TABLE "StickerOrder" DROP CONSTRAINT "StickerOrder_costumeId_fkey";
ALTER TABLE "StickerOrder" DROP CONSTRAINT "StickerOrder_sizeOptionId_fkey";
DROP INDEX IF EXISTS "StickerOrder_costumeId_idx";
DROP INDEX IF EXISTS "StickerOrder_borderId_idx";
DROP INDEX IF EXISTS "StickerOrder_email_idx";
ALTER TABLE "StickerOrder" DROP CONSTRAINT "StickerOrder_pkey";
DROP TABLE "StickerOrder";
ALTER TABLE "StickerOrder_new" RENAME TO "StickerOrder";
ALTER TABLE "StickerOrder" RENAME CONSTRAINT "StickerOrder_new_pkey" TO "StickerOrder_pkey";
CREATE INDEX "StickerOrder_costumeId_idx" ON "StickerOrder"("costumeId");
CREATE INDEX "StickerOrder_borderId_idx" ON "StickerOrder"("borderId");
CREATE INDEX "StickerOrder_email_idx" ON "StickerOrder"("email");
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "StickerTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_borderId_fkey" FOREIGN KEY ("borderId") REFERENCES "StickerBorder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_costumeId_fkey" FOREIGN KEY ("costumeId") REFERENCES "StickerCostume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StickerOrder" ADD CONSTRAINT "StickerOrder_sizeOptionId_fkey" FOREIGN KEY ("sizeOptionId") REFERENCES "StickerSizeOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_sticker_order_id_fkey" FOREIGN KEY ("sticker_order_id") REFERENCES "StickerOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER sticker_order_sync_email
BEFORE INSERT OR UPDATE ON "StickerOrder"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_user_id_camel();

-- reviews
ALTER TABLE "review_images" DROP CONSTRAINT "review_images_review_id_fkey";

CREATE TABLE "reviews_new" AS
SELECT "id", "user_id", "email", "storybook_order_id", "sticker_order_id", "product_id", "rating", "content", "is_featured", "featured_at", "created_at", "updated_at"
FROM "reviews";

ALTER TABLE "reviews_new" ADD CONSTRAINT "reviews_new_pkey" PRIMARY KEY ("id");
ALTER TABLE "reviews_new" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "reviews_new" ALTER COLUMN "rating" SET NOT NULL;
ALTER TABLE "reviews_new" ALTER COLUMN "content" SET NOT NULL;
ALTER TABLE "reviews_new" ALTER COLUMN "is_featured" SET NOT NULL;
ALTER TABLE "reviews_new" ALTER COLUMN "is_featured" SET DEFAULT false;
ALTER TABLE "reviews_new" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "reviews_new" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "reviews_new" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "reviews_new" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS reviews_sync_email ON "reviews";
DROP TRIGGER IF EXISTS reviews_eligibility_trigger ON "reviews";
DROP POLICY IF EXISTS "reviews_select_own" ON "reviews";
DROP POLICY IF EXISTS "reviews_insert_own" ON "reviews";
DROP POLICY IF EXISTS "reviews_update_own" ON "reviews";
DROP POLICY IF EXISTS "review_images_select_own" ON "review_images";
DROP POLICY IF EXISTS "review_images_insert_own" ON "review_images";
DROP POLICY IF EXISTS "review_images_update_own" ON "review_images";
DROP POLICY IF EXISTS "review_images_delete_own" ON "review_images";
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_user_id_fkey";
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_storybook_order_id_fkey";
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_sticker_order_id_fkey";
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_rating_range";
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_single_order";
DROP INDEX IF EXISTS "reviews_user_id_created_at_idx";
DROP INDEX IF EXISTS "reviews_is_featured_featured_at_idx";
DROP INDEX IF EXISTS "reviews_email_idx";
DROP INDEX IF EXISTS "reviews_storybook_order_id_key";
DROP INDEX IF EXISTS "reviews_sticker_order_id_key";
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_pkey";
DROP TABLE "reviews";
ALTER TABLE "reviews_new" RENAME TO "reviews";
ALTER TABLE "reviews" RENAME CONSTRAINT "reviews_new_pkey" TO "reviews_pkey";
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_single_order" CHECK (
  NOT (
    "storybook_order_id" IS NOT NULL
    AND "sticker_order_id" IS NOT NULL
  )
);
CREATE INDEX "reviews_user_id_created_at_idx" ON "reviews"("user_id", "created_at");
CREATE INDEX "reviews_is_featured_featured_at_idx" ON "reviews"("is_featured", "featured_at");
CREATE INDEX "reviews_email_idx" ON "reviews"("email");
CREATE UNIQUE INDEX "reviews_storybook_order_id_key" ON "reviews"("storybook_order_id") WHERE "storybook_order_id" IS NOT NULL;
CREATE UNIQUE INDEX "reviews_sticker_order_id_key" ON "reviews"("sticker_order_id") WHERE "sticker_order_id" IS NOT NULL;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_storybook_order_id_fkey" FOREIGN KEY ("storybook_order_id") REFERENCES "StorybookOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_sticker_order_id_fkey" FOREIGN KEY ("sticker_order_id") REFERENCES "StickerOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TRIGGER reviews_sync_email
BEFORE INSERT OR UPDATE ON "reviews"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_user_id_snake();
CREATE TRIGGER reviews_eligibility_trigger
BEFORE INSERT OR UPDATE ON "reviews"
FOR EACH ROW
EXECUTE FUNCTION public.enforce_review_eligibility();
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select_own"
ON "reviews" FOR SELECT TO authenticated
USING ("user_id" = auth.uid()::text);
CREATE POLICY "reviews_insert_own"
ON "reviews" FOR INSERT TO authenticated
WITH CHECK (
  "user_id" = auth.uid()::text
  AND public.review_is_eligible_order("user_id", "storybook_order_id", "sticker_order_id")
);
CREATE POLICY "reviews_update_own"
ON "reviews" FOR UPDATE TO authenticated
USING ("user_id" = auth.uid()::text)
WITH CHECK (
  "user_id" = auth.uid()::text
  AND public.review_is_eligible_order("user_id", "storybook_order_id", "sticker_order_id")
);

CREATE POLICY "review_images_select_own"
ON "review_images" FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "reviews" r
    WHERE r.id = review_id AND r.user_id = auth.uid()::text
  )
);
CREATE POLICY "review_images_insert_own"
ON "review_images" FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "reviews" r
    WHERE r.id = review_id AND r.user_id = auth.uid()::text
  )
);
CREATE POLICY "review_images_update_own"
ON "review_images" FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "reviews" r
    WHERE r.id = review_id AND r.user_id = auth.uid()::text
  )
);
CREATE POLICY "review_images_delete_own"
ON "review_images" FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "reviews" r
    WHERE r.id = review_id AND r.user_id = auth.uid()::text
  )
);
