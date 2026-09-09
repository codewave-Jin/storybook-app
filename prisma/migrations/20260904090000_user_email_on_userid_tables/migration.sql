-- Lookup email on every table that stores a user id.

ALTER TABLE "TokenTransaction" ADD COLUMN "email" TEXT;
ALTER TABLE "Character" ADD COLUMN "email" TEXT;
ALTER TABLE "StorybookOrder" ADD COLUMN "email" TEXT;
ALTER TABLE "StickerOrder" ADD COLUMN "email" TEXT;
ALTER TABLE "reviews" ADD COLUMN "email" TEXT;
ALTER TABLE "generation_events" ADD COLUMN "email" TEXT;

UPDATE "TokenTransaction" AS t
SET "email" = u.email
FROM "User" AS u
WHERE u.id = t."userId";

UPDATE "Character" AS c
SET "email" = u.email
FROM "User" AS u
WHERE u.id = c."userId";

UPDATE "StorybookOrder" AS o
SET "email" = u.email
FROM "User" AS u
WHERE u.id = o."userId";

UPDATE "StickerOrder" AS o
SET "email" = u.email
FROM "User" AS u
WHERE u.id = o."userId";

UPDATE "reviews" AS r
SET "email" = u.email
FROM "User" AS u
WHERE u.id = r.user_id;

UPDATE "generation_events" AS e
SET "email" = u.email
FROM "User" AS u
WHERE u.id = e.user_id;

CREATE INDEX "TokenTransaction_email_idx" ON "TokenTransaction"("email");
CREATE INDEX "Character_email_idx" ON "Character"("email");
CREATE INDEX "StorybookOrder_email_idx" ON "StorybookOrder"("email");
CREATE INDEX "StickerOrder_email_idx" ON "StickerOrder"("email");
CREATE INDEX "reviews_email_idx" ON "reviews"("email");
CREATE INDEX "generation_events_email_idx" ON "generation_events"("email");

CREATE OR REPLACE FUNCTION sync_email_from_user_id_camel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."userId" IS NULL THEN
    NEW.email := NULL;
  ELSE
    SELECT u.email INTO NEW.email
    FROM "User" AS u
    WHERE u.id = NEW."userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_email_from_user_id_snake()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.email := NULL;
  ELSE
    SELECT u.email INTO NEW.email
    FROM "User" AS u
    WHERE u.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER token_transaction_sync_email
BEFORE INSERT OR UPDATE ON "TokenTransaction"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_user_id_camel();

CREATE TRIGGER character_sync_email
BEFORE INSERT OR UPDATE ON "Character"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_user_id_camel();

CREATE TRIGGER storybook_order_sync_email
BEFORE INSERT OR UPDATE ON "StorybookOrder"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_user_id_camel();

CREATE TRIGGER sticker_order_sync_email
BEFORE INSERT OR UPDATE ON "StickerOrder"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_user_id_camel();

CREATE TRIGGER reviews_sync_email
BEFORE INSERT OR UPDATE ON "reviews"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_user_id_snake();

CREATE TRIGGER generation_events_sync_email
BEFORE INSERT OR UPDATE ON "generation_events"
FOR EACH ROW
EXECUTE FUNCTION sync_email_from_user_id_snake();

CREATE OR REPLACE FUNCTION sync_token_balance_email_from_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "TokenBalance"
  SET "email" = NEW.email
  WHERE "userId" = NEW.id;

  UPDATE "TokenTransaction"
  SET "email" = NEW.email
  WHERE "userId" = NEW.id;

  UPDATE "Character"
  SET "email" = NEW.email
  WHERE "userId" = NEW.id;

  UPDATE "StorybookOrder"
  SET "email" = NEW.email
  WHERE "userId" = NEW.id;

  UPDATE "StickerOrder"
  SET "email" = NEW.email
  WHERE "userId" = NEW.id;

  UPDATE "reviews"
  SET "email" = NEW.email
  WHERE user_id = NEW.id;

  UPDATE "generation_events"
  SET "email" = NEW.email
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
