-- Split daily free tokens from purchased tokens.
ALTER TABLE "TokenBalance" ADD COLUMN "paidBalance" INTEGER NOT NULL DEFAULT 0;

UPDATE "TokenBalance"
SET
  "paidBalance" = GREATEST("balance" - 3, 0),
  "balance" = LEAST("balance", 3);

ALTER TABLE "TokenBalance" RENAME COLUMN "balance" TO "freeBalance";
