-- Emoticon previews spend one token and return it when the pack is purchased.
ALTER TYPE "TokenTransactionType" ADD VALUE IF NOT EXISTS 'EMOTICON_PREVIEW';
ALTER TYPE "TokenHoldKind" ADD VALUE IF NOT EXISTS 'EMOTICON_PREVIEW';
