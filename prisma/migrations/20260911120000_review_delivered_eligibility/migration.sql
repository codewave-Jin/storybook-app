-- Reviews open after fulfillment DELIVERED (배송완료), not production COMPLETED (제작완료).
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
          AND o."fulfillmentStatus" = 'DELIVERED'
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
      RAISE EXCEPTION '리뷰는 배송이 완료된 본인 주문에만 작성할 수 있습니다';
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
        RAISE EXCEPTION '리뷰는 배송이 완료된 본인 주문에만 작성할 수 있습니다';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;
