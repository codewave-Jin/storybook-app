-- Order completion spends tokens instead of a cash checkout.
ALTER TYPE "TokenTransactionType" ADD VALUE IF NOT EXISTS 'STORYBOOK_ORDER';
ALTER TYPE "TokenTransactionType" ADD VALUE IF NOT EXISTS 'STICKER_ORDER';
ALTER TYPE "TokenTransactionType" ADD VALUE IF NOT EXISTS 'EMOTICON_ORDER';
