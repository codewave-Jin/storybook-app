-- Put email immediately after id, and add email to user-owned child tables.

CREATE OR REPLACE FUNCTION sync_email_from_character_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT u.email INTO NEW.email
  FROM "Character" c
  JOIN "User" u ON u.id = c."userId"
  WHERE c.id = NEW."characterId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_email_from_storybook_order_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT u.email INTO NEW.email
  FROM "StorybookOrder" o
  JOIN "User" u ON u.id = o."userId"
  WHERE o.id = NEW."orderId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_email_from_order_id_snake()
RETURNS TRIGGER AS $$
BEGIN
  SELECT u.email INTO NEW.email
  FROM "StorybookOrder" o
  JOIN "User" u ON u.id = o."userId"
  WHERE o.id = NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_email_from_review_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT r.email INTO NEW.email
  FROM reviews r
  WHERE r.id = NEW.review_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_token_balance_email_from_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "TokenBalance" SET "email" = NEW.email WHERE "userId" = NEW.id;
  UPDATE "TokenTransaction" SET "email" = NEW.email WHERE "userId" = NEW.id;
  UPDATE "Character" SET "email" = NEW.email WHERE "userId" = NEW.id;
  UPDATE "StorybookOrder" SET "email" = NEW.email WHERE "userId" = NEW.id;
  UPDATE "StickerOrder" SET "email" = NEW.email WHERE "userId" = NEW.id;
  UPDATE "reviews" SET "email" = NEW.email WHERE user_id = NEW.id;
  UPDATE "generation_events" SET "email" = NEW.email WHERE user_id = NEW.id;

  UPDATE "CharacterAsset" a
  SET email = NEW.email
  FROM "Character" c
  WHERE a."characterId" = c.id AND c."userId" = NEW.id;

  UPDATE "Illustration" i
  SET email = NEW.email
  FROM "StorybookOrder" o
  WHERE i."orderId" = o.id AND o."userId" = NEW.id;

  UPDATE "PhotoAlbumPage" p
  SET email = NEW.email
  FROM "StorybookOrder" o
  WHERE p."orderId" = o.id AND o."userId" = NEW.id;

  UPDATE review_images img
  SET email = NEW.email
  FROM reviews r
  WHERE img.review_id = r.id AND r.user_id = NEW.id;

  UPDATE order_status_logs l
  SET email = NEW.email
  FROM "StorybookOrder" o
  WHERE l.order_id = o.id AND o."userId" = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TokenBalance: id, email, userId, ...
CREATE TABLE "TokenBalance_new" AS
SELECT "id", "email", "userId", "freeBalance", "paidBalance", "lastFreeGrantDate"
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
SELECT "id", "email", "userId", "amount", "type", "createdAt"
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
SELECT "id", "email", "kind", "entity_id", "order_id", "user_id", "step", "message", "detail", "created_at"
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
SELECT "id", "email", "userId", "label", "gender", "originalPhotoPath", "generatedImagePath", "seed", "status", "progressPercent", "progressLabel", "createdAt"
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
SELECT "id", "email", "userId", "templateId", "selectedCharacterIds", "customInputValues", "artStyleId", "characterAssetId", "paymentStatus", "productionStatus", "fulfillmentStatus", "expectedDeliveryAt", "shippingCarrier", "trackingNumber", "previewGeneratedAt", "createdAt"
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
SELECT "id", "email", "userId", "characterId", "templateId", "borderId", "costumeId", "customCostumeHint", "phrase", "sizeOptionId", "quantity", "previewImagePath", "finalImagePath", "compositeImagePath", "previewStatus", "errorReason", "paymentStatus", "productionStatus", "createdAt"
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
DROP POLICY IF EXISTS "review_images_select_own" ON "review_images";
DROP POLICY IF EXISTS "review_images_insert_own" ON "review_images";
DROP POLICY IF EXISTS "review_images_update_own" ON "review_images";
DROP POLICY IF EXISTS "review_images_delete_own" ON "review_images";

CREATE TABLE "reviews_new" AS
SELECT "id", "email", "user_id", "storybook_order_id", "sticker_order_id", "product_id", "rating", "content", "is_featured", "featured_at", "created_at", "updated_at"
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

-- CharacterAsset
ALTER TABLE "StorybookOrder" DROP CONSTRAINT "StorybookOrder_characterAssetId_fkey";

CREATE TABLE "CharacterAsset_new" AS
SELECT a."id", u.email, a."characterId", a."artStyleId", a."rawPortraitUrl", a."styledImageUrl", a."status", a."retryCount", a."createdAt", a."updatedAt"
FROM "CharacterAsset" a
JOIN "Character" c ON c.id = a."characterId"
JOIN "User" u ON u.id = c."userId";

ALTER TABLE "CharacterAsset_new" ADD CONSTRAINT "CharacterAsset_new_pkey" PRIMARY KEY ("id");
ALTER TABLE "CharacterAsset_new" ALTER COLUMN "characterId" SET NOT NULL;
ALTER TABLE "CharacterAsset_new" ALTER COLUMN "artStyleId" SET NOT NULL;
ALTER TABLE "CharacterAsset_new" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "CharacterAsset_new" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "CharacterAsset_new" ALTER COLUMN "retryCount" SET NOT NULL;
ALTER TABLE "CharacterAsset_new" ALTER COLUMN "retryCount" SET DEFAULT 0;
ALTER TABLE "CharacterAsset_new" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "CharacterAsset_new" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CharacterAsset_new" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "CharacterAsset_new" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "CharacterAsset" DROP CONSTRAINT "CharacterAsset_characterId_fkey";
ALTER TABLE "CharacterAsset" DROP CONSTRAINT "CharacterAsset_artStyleId_fkey";
DROP INDEX IF EXISTS "CharacterAsset_characterId_artStyleId_idx";
DROP INDEX IF EXISTS "CharacterAsset_artStyleId_idx";
ALTER TABLE "CharacterAsset" DROP CONSTRAINT "CharacterAsset_pkey";
DROP TABLE "CharacterAsset";
ALTER TABLE "CharacterAsset_new" RENAME TO "CharacterAsset";
ALTER TABLE "CharacterAsset" RENAME CONSTRAINT "CharacterAsset_new_pkey" TO "CharacterAsset_pkey";
CREATE INDEX "CharacterAsset_characterId_artStyleId_idx" ON "CharacterAsset"("characterId", "artStyleId");
CREATE INDEX "CharacterAsset_artStyleId_idx" ON "CharacterAsset"("artStyleId");
CREATE INDEX "CharacterAsset_email_idx" ON "CharacterAsset"("email");
ALTER TABLE "CharacterAsset" ADD CONSTRAINT "CharacterAsset_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterAsset" ADD CONSTRAINT "CharacterAsset_artStyleId_fkey" FOREIGN KEY ("artStyleId") REFERENCES "ArtStyle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StorybookOrder" ADD CONSTRAINT "StorybookOrder_characterAssetId_fkey" FOREIGN KEY ("characterAssetId") REFERENCES "CharacterAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TRIGGER character_asset_sync_email
BEFORE INSERT OR UPDATE ON "CharacterAsset"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_character_id();

-- Illustration
CREATE TABLE "Illustration_new" AS
SELECT i."id", o.email, i."orderId", i."pageNumber", i."prompt", i."selectedCharacterIds", i."imagePath", i."sceneImagePath", i."upscaledImagePath", i."seed", i."status", i."progressPercent", i."progressLabel", i."pageType", i."isAutoGenerated", i."errorReason", i."createdAt", i."updatedAt"
FROM "Illustration" i
JOIN "StorybookOrder" o ON o.id = i."orderId";

ALTER TABLE "Illustration_new" ADD CONSTRAINT "Illustration_new_pkey" PRIMARY KEY ("id");
ALTER TABLE "Illustration_new" ALTER COLUMN "orderId" SET NOT NULL;
ALTER TABLE "Illustration_new" ALTER COLUMN "pageNumber" SET NOT NULL;
ALTER TABLE "Illustration_new" ALTER COLUMN "prompt" SET NOT NULL;
ALTER TABLE "Illustration_new" ALTER COLUMN "selectedCharacterIds" SET NOT NULL;
ALTER TABLE "Illustration_new" ALTER COLUMN "selectedCharacterIds" SET DEFAULT '[]';
ALTER TABLE "Illustration_new" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Illustration_new" ALTER COLUMN "status" SET DEFAULT 'IDLE';
ALTER TABLE "Illustration_new" ALTER COLUMN "progressPercent" SET NOT NULL;
ALTER TABLE "Illustration_new" ALTER COLUMN "progressPercent" SET DEFAULT 0;
ALTER TABLE "Illustration_new" ALTER COLUMN "pageType" SET NOT NULL;
ALTER TABLE "Illustration_new" ALTER COLUMN "pageType" SET DEFAULT 'PAGE';
ALTER TABLE "Illustration_new" ALTER COLUMN "isAutoGenerated" SET NOT NULL;
ALTER TABLE "Illustration_new" ALTER COLUMN "isAutoGenerated" SET DEFAULT false;
ALTER TABLE "Illustration_new" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "Illustration_new" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Illustration_new" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Illustration_new" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Illustration" DROP CONSTRAINT "Illustration_orderId_fkey";
ALTER TABLE "Illustration" DROP CONSTRAINT "Illustration_pkey";
DROP TABLE "Illustration";
ALTER TABLE "Illustration_new" RENAME TO "Illustration";
ALTER TABLE "Illustration" RENAME CONSTRAINT "Illustration_new_pkey" TO "Illustration_pkey";
CREATE INDEX "Illustration_email_idx" ON "Illustration"("email");
ALTER TABLE "Illustration" ADD CONSTRAINT "Illustration_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StorybookOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER illustration_sync_email
BEFORE INSERT OR UPDATE ON "Illustration"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_storybook_order_id();

-- PhotoAlbumPage
CREATE TABLE "PhotoAlbumPage_new" AS
SELECT p."id", o.email, p."orderId", p."layoutId", p."photoPaths"
FROM "PhotoAlbumPage" p
JOIN "StorybookOrder" o ON o.id = p."orderId";

ALTER TABLE "PhotoAlbumPage_new" ADD CONSTRAINT "PhotoAlbumPage_new_pkey" PRIMARY KEY ("id");
ALTER TABLE "PhotoAlbumPage_new" ALTER COLUMN "orderId" SET NOT NULL;
ALTER TABLE "PhotoAlbumPage_new" ALTER COLUMN "layoutId" SET NOT NULL;
ALTER TABLE "PhotoAlbumPage_new" ALTER COLUMN "photoPaths" SET NOT NULL;

ALTER TABLE "PhotoAlbumPage" DROP CONSTRAINT "PhotoAlbumPage_orderId_fkey";
ALTER TABLE "PhotoAlbumPage" DROP CONSTRAINT "PhotoAlbumPage_pkey";
DROP TABLE "PhotoAlbumPage";
ALTER TABLE "PhotoAlbumPage_new" RENAME TO "PhotoAlbumPage";
ALTER TABLE "PhotoAlbumPage" RENAME CONSTRAINT "PhotoAlbumPage_new_pkey" TO "PhotoAlbumPage_pkey";
CREATE INDEX "PhotoAlbumPage_email_idx" ON "PhotoAlbumPage"("email");
ALTER TABLE "PhotoAlbumPage" ADD CONSTRAINT "PhotoAlbumPage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StorybookOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER photo_album_page_sync_email
BEFORE INSERT OR UPDATE ON "PhotoAlbumPage"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_storybook_order_id();

-- order_status_logs
CREATE TABLE "order_status_logs_new" AS
SELECT l."id", o.email, l."order_id", l."from_status", l."to_status", l."carrier", l."tracking_number", l."actor_id", l."created_at"
FROM order_status_logs l
JOIN "StorybookOrder" o ON o.id = l.order_id;

ALTER TABLE "order_status_logs_new" ADD CONSTRAINT "order_status_logs_new_pkey" PRIMARY KEY ("id");
ALTER TABLE "order_status_logs_new" ALTER COLUMN "order_id" SET NOT NULL;
ALTER TABLE "order_status_logs_new" ALTER COLUMN "to_status" SET NOT NULL;
ALTER TABLE "order_status_logs_new" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "order_status_logs_new" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "order_status_logs" DROP CONSTRAINT "order_status_logs_order_id_fkey";
ALTER TABLE "order_status_logs" DROP CONSTRAINT "order_status_logs_actor_id_fkey";
DROP INDEX IF EXISTS "order_status_logs_order_id_created_at_idx";
ALTER TABLE "order_status_logs" DROP CONSTRAINT "order_status_logs_pkey";
DROP TABLE "order_status_logs";
ALTER TABLE "order_status_logs_new" RENAME TO "order_status_logs";
ALTER TABLE "order_status_logs" RENAME CONSTRAINT "order_status_logs_new_pkey" TO "order_status_logs_pkey";
CREATE INDEX "order_status_logs_order_id_created_at_idx" ON "order_status_logs"("order_id", "created_at");
CREATE INDEX "order_status_logs_email_idx" ON "order_status_logs"("email");
ALTER TABLE "order_status_logs" ADD CONSTRAINT "order_status_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "StorybookOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_status_logs" ADD CONSTRAINT "order_status_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TRIGGER order_status_logs_sync_email
BEFORE INSERT OR UPDATE ON "order_status_logs"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_order_id_snake();

-- review_images
CREATE TABLE "review_images_new" AS
SELECT i."id", r.email, i."review_id", i."image_url", i."sort_order"
FROM review_images i
JOIN reviews r ON r.id = i.review_id;

ALTER TABLE "review_images_new" ADD CONSTRAINT "review_images_new_pkey" PRIMARY KEY ("id");
ALTER TABLE "review_images_new" ALTER COLUMN "review_id" SET NOT NULL;
ALTER TABLE "review_images_new" ALTER COLUMN "image_url" SET NOT NULL;
ALTER TABLE "review_images_new" ALTER COLUMN "sort_order" SET NOT NULL;
ALTER TABLE "review_images_new" ALTER COLUMN "sort_order" SET DEFAULT 0;

ALTER TABLE "review_images" DROP CONSTRAINT "review_images_review_id_fkey";
DROP INDEX IF EXISTS "review_images_review_id_idx";
ALTER TABLE "review_images" DROP CONSTRAINT "review_images_pkey";
DROP TABLE "review_images";
ALTER TABLE "review_images_new" RENAME TO "review_images";
ALTER TABLE "review_images" RENAME CONSTRAINT "review_images_new_pkey" TO "review_images_pkey";
CREATE INDEX "review_images_review_id_idx" ON "review_images"("review_id");
CREATE INDEX "review_images_email_idx" ON "review_images"("email");
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_images" ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER review_images_sync_email
BEFORE INSERT OR UPDATE ON "review_images"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_review_id();
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
