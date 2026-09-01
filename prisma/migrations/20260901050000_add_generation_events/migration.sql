CREATE TABLE "generation_events" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "order_id" TEXT,
    "user_id" TEXT,
    "step" TEXT NOT NULL,
    "message" TEXT,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "generation_events_entity_id_created_at_idx" ON "generation_events"("entity_id", "created_at");
CREATE INDEX "generation_events_order_id_created_at_idx" ON "generation_events"("order_id", "created_at");
CREATE INDEX "generation_events_kind_created_at_idx" ON "generation_events"("kind", "created_at");
