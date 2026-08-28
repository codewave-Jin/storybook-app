-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PREPARING', 'PRINTING', 'PRINTED', 'SHIPPING', 'DELIVERED');

-- AlterTable
ALTER TABLE "StorybookOrder" ADD COLUMN "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PREPARING';
ALTER TABLE "StorybookOrder" ADD COLUMN "expectedDeliveryAt" TIMESTAMP(3);
ALTER TABLE "StorybookOrder" ADD COLUMN "shippingCarrier" TEXT;
ALTER TABLE "StorybookOrder" ADD COLUMN "trackingNumber" TEXT;

UPDATE "StorybookOrder"
SET "expectedDeliveryAt" = "createdAt" + INTERVAL '7 days'
WHERE "expectedDeliveryAt" IS NULL;

-- CreateTable
CREATE TABLE "order_status_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_status" "FulfillmentStatus",
    "to_status" "FulfillmentStatus" NOT NULL,
    "carrier" TEXT,
    "tracking_number" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_status_logs_order_id_created_at_idx"
  ON "order_status_logs"("order_id", "created_at");

ALTER TABLE "order_status_logs"
  ADD CONSTRAINT "order_status_logs_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "StorybookOrder"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_status_logs"
  ADD CONSTRAINT "order_status_logs_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
