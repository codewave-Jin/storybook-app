-- Existing app has no `orders` / `auth.users` tables.
-- Map review.order to StorybookOrder or StickerOrder, user to "User".
-- Closest "배송완료" gate: paymentStatus = PAID AND productionStatus = COMPLETED.

-- Shadow DB (plain Postgres) has no Supabase auth schema/roles.
-- Create stubs only when missing so this file can replay without replacing
-- real Supabase auth.uid() on a fresh hosted project.
DO $$
BEGIN
  CREATE SCHEMA IF NOT EXISTS auth;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth'
      AND p.proname = 'uid'
      AND p.pronargs = 0
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $inner$ SELECT NULL::uuid; $inner$;
    $fn$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

ALTER TABLE "Review" RENAME TO "reviews";

ALTER TABLE "reviews" RENAME CONSTRAINT "Review_pkey" TO "reviews_pkey";
ALTER TABLE "reviews" RENAME CONSTRAINT "Review_userId_fkey" TO "reviews_user_id_fkey";
ALTER INDEX "Review_userId_createdAt_idx" RENAME TO "reviews_user_id_created_at_idx";

ALTER TABLE "reviews" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "reviews" RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "reviews" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "reviews" ADD COLUMN "storybook_order_id" TEXT;
ALTER TABLE "reviews" ADD COLUMN "sticker_order_id" TEXT;
ALTER TABLE "reviews" ADD COLUMN "product_id" TEXT;

ALTER TABLE "reviews" ALTER COLUMN "rating" TYPE SMALLINT;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_single_order" CHECK (
  NOT (
    "storybook_order_id" IS NOT NULL
    AND "sticker_order_id" IS NOT NULL
  )
);

CREATE UNIQUE INDEX "reviews_storybook_order_id_key"
  ON "reviews"("storybook_order_id")
  WHERE "storybook_order_id" IS NOT NULL;

CREATE UNIQUE INDEX "reviews_sticker_order_id_key"
  ON "reviews"("sticker_order_id")
  WHERE "sticker_order_id" IS NOT NULL;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_storybook_order_id_fkey"
  FOREIGN KEY ("storybook_order_id") REFERENCES "StorybookOrder"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_sticker_order_id_fkey"
  FOREIGN KEY ("sticker_order_id") REFERENCES "StickerOrder"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "review_images" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "review_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "review_images_review_id_idx" ON "review_images"("review_id");

ALTER TABLE "review_images"
  ADD CONSTRAINT "review_images_review_id_fkey"
  FOREIGN KEY ("review_id") REFERENCES "reviews"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION public.review_is_eligible_order(
  p_user_id TEXT,
  p_storybook_order_id TEXT,
  p_sticker_order_id TEXT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    CASE
      WHEN p_storybook_order_id IS NOT NULL THEN EXISTS (
        SELECT 1
        FROM "StorybookOrder" o
        WHERE o.id = p_storybook_order_id
          AND o."userId" = p_user_id
          AND o."paymentStatus" = 'PAID'
          AND o."productionStatus" = 'COMPLETED'
      )
      WHEN p_sticker_order_id IS NOT NULL THEN EXISTS (
        SELECT 1
        FROM "StickerOrder" o
        WHERE o.id = p_sticker_order_id
          AND o."userId" = p_user_id
          AND o."paymentStatus" = 'PAID'
          AND o."productionStatus" = 'COMPLETED'
      )
      ELSE FALSE
    END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_review_eligibility()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.review_is_eligible_order(
      NEW.user_id,
      NEW.storybook_order_id,
      NEW.sticker_order_id
    ) THEN
      RAISE EXCEPTION '리뷰는 결제·제작이 완료된 본인 주문에만 작성할 수 있습니다';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.storybook_order_id IS DISTINCT FROM OLD.storybook_order_id
      OR NEW.sticker_order_id IS DISTINCT FROM OLD.sticker_order_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      IF NOT public.review_is_eligible_order(
        NEW.user_id,
        NEW.storybook_order_id,
        NEW.sticker_order_id
      ) THEN
        RAISE EXCEPTION '리뷰는 결제·제작이 완료된 본인 주문에만 작성할 수 있습니다';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_eligibility_trigger
BEFORE INSERT OR UPDATE ON "reviews"
FOR EACH ROW
EXECUTE FUNCTION public.enforce_review_eligibility();

ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "review_images" ENABLE ROW LEVEL SECURITY;

-- PostgREST (authenticated): own rows only. Prisma table-owner role bypasses RLS.
CREATE POLICY "reviews_select_own"
ON "reviews" FOR SELECT TO authenticated
USING ("user_id" = auth.uid()::text);

CREATE POLICY "reviews_insert_own"
ON "reviews" FOR INSERT TO authenticated
WITH CHECK (
  "user_id" = auth.uid()::text
  AND public.review_is_eligible_order("user_id", "storybook_order_id", "sticker_order_id")
);

CREATE POLICY "reviews_update_own"
ON "reviews" FOR UPDATE TO authenticated
USING ("user_id" = auth.uid()::text)
WITH CHECK (
  "user_id" = auth.uid()::text
  AND public.review_is_eligible_order("user_id", "storybook_order_id", "sticker_order_id")
);

CREATE POLICY "review_images_select_own"
ON "review_images" FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "reviews" r
    WHERE r.id = review_id AND r.user_id = auth.uid()::text
  )
);

CREATE POLICY "review_images_insert_own"
ON "review_images" FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "reviews" r
    WHERE r.id = review_id AND r.user_id = auth.uid()::text
  )
);

CREATE POLICY "review_images_update_own"
ON "review_images" FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "reviews" r
    WHERE r.id = review_id AND r.user_id = auth.uid()::text
  )
);

CREATE POLICY "review_images_delete_own"
ON "review_images" FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "reviews" r
    WHERE r.id = review_id AND r.user_id = auth.uid()::text
  )
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public)
  VALUES ('review-images', 'review-images', false)
  ON CONFLICT (id) DO NOTHING;

  DROP POLICY IF EXISTS "review_images_storage_select_own" ON storage.objects;
  DROP POLICY IF EXISTS "review_images_storage_insert_own" ON storage.objects;
  DROP POLICY IF EXISTS "review_images_storage_update_own" ON storage.objects;
  DROP POLICY IF EXISTS "review_images_storage_delete_own" ON storage.objects;

  CREATE POLICY "review_images_storage_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

  CREATE POLICY "review_images_storage_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

  CREATE POLICY "review_images_storage_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

  CREATE POLICY "review_images_storage_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
END $$;
