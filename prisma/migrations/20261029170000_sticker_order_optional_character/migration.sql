-- Real-photo stickers are saved without a character.
ALTER TABLE "StickerOrder" ALTER COLUMN "characterId" DROP NOT NULL;
