ALTER TABLE "TokenBalance" ADD COLUMN "email" TEXT;

UPDATE "TokenBalance" AS t
SET "email" = u.email
FROM "User" AS u
WHERE u.id = t."userId";

CREATE INDEX "TokenBalance_email_idx" ON "TokenBalance"("email");

CREATE OR REPLACE FUNCTION sync_token_balance_email()
RETURNS TRIGGER AS $$
BEGIN
  SELECT u.email INTO NEW.email
  FROM "User" AS u
  WHERE u.id = NEW."userId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER token_balance_sync_email
BEFORE INSERT OR UPDATE ON "TokenBalance"
FOR EACH ROW
EXECUTE FUNCTION sync_token_balance_email();

CREATE OR REPLACE FUNCTION sync_token_balance_email_from_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "TokenBalance"
  SET "email" = NEW.email
  WHERE "userId" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_email_sync_token_balance
AFTER UPDATE OF email ON "User"
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION sync_token_balance_email_from_user();
