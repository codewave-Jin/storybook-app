-- Sticker reviews follow fulfillment DELIVERED, same as storybooks.
-- Sticker productionStatus stays WAITING after payment, so COMPLETED never matches.
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
          AND o."fulfillmentStatus" = 'DELIVERED'
      )
      ELSE FALSE
    END;
$$;
