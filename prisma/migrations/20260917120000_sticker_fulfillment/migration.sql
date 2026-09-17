-- AlterTable
ALTER TABLE "StickerOrder" ADD COLUMN "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PREPARING';
ALTER TABLE "StickerOrder" ADD COLUMN "expectedDeliveryAt" TIMESTAMP(3);
ALTER TABLE "StickerOrder" ADD COLUMN "shippingCarrier" TEXT;
ALTER TABLE "StickerOrder" ADD COLUMN "trackingNumber" TEXT;

UPDATE "StickerOrder"
SET
  "fulfillmentStatus" = 'PRINTING',
  "expectedDeliveryAt" = COALESCE("expectedDeliveryAt", "createdAt" + INTERVAL '7 days')
WHERE "paymentStatus" = 'PAID';
