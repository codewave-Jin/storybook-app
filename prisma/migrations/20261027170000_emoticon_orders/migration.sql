CREATE TABLE "emoticon_orders" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "userId" TEXT NOT NULL,
    "sheetImagePath" TEXT NOT NULL,
    "cellImagePaths" TEXT[],
    "age" INTEGER,
    "ageUnit" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emoticon_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "emoticon_orders_userId_createdAt_idx" ON "emoticon_orders"("userId", "createdAt");

CREATE INDEX "emoticon_orders_email_idx" ON "emoticon_orders"("email");

ALTER TABLE "emoticon_orders" ADD CONSTRAINT "emoticon_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
