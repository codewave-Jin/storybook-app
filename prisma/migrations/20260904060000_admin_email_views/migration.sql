-- Admin lookup views: original tables stay unchanged.
-- Open these in Supabase Table Editor to see email next to user-owned rows.

CREATE OR REPLACE VIEW token_balance_with_email AS
SELECT u.email, u.name AS user_name, t.*
FROM "TokenBalance" t
JOIN "User" u ON u.id = t."userId";

CREATE OR REPLACE VIEW token_transaction_with_email AS
SELECT u.email, u.name AS user_name, t.*
FROM "TokenTransaction" t
JOIN "User" u ON u.id = t."userId";

CREATE OR REPLACE VIEW character_with_email AS
SELECT u.email, u.name AS user_name, c.*
FROM "Character" c
JOIN "User" u ON u.id = c."userId";

CREATE OR REPLACE VIEW character_asset_with_email AS
SELECT u.email, u.name AS user_name, a.*
FROM "CharacterAsset" a
JOIN "Character" c ON c.id = a."characterId"
JOIN "User" u ON u.id = c."userId";

CREATE OR REPLACE VIEW storybook_order_with_email AS
SELECT u.email, u.name AS user_name, o.*
FROM "StorybookOrder" o
JOIN "User" u ON u.id = o."userId";

CREATE OR REPLACE VIEW sticker_order_with_email AS
SELECT u.email, u.name AS user_name, o.*
FROM "StickerOrder" o
JOIN "User" u ON u.id = o."userId";

CREATE OR REPLACE VIEW review_with_email AS
SELECT u.email, u.name AS user_name, r.*
FROM reviews r
JOIN "User" u ON u.id = r.user_id;

CREATE OR REPLACE VIEW review_image_with_email AS
SELECT u.email, u.name AS user_name, i.*
FROM review_images i
JOIN reviews r ON r.id = i.review_id
JOIN "User" u ON u.id = r.user_id;

CREATE OR REPLACE VIEW illustration_with_email AS
SELECT u.email, u.name AS user_name, i.*
FROM "Illustration" i
JOIN "StorybookOrder" o ON o.id = i."orderId"
JOIN "User" u ON u.id = o."userId";

CREATE OR REPLACE VIEW photo_album_page_with_email AS
SELECT u.email, u.name AS user_name, p.*
FROM "PhotoAlbumPage" p
JOIN "StorybookOrder" o ON o.id = p."orderId"
JOIN "User" u ON u.id = o."userId";

CREATE OR REPLACE VIEW order_status_log_with_email AS
SELECT
  owner.email AS email,
  owner.name AS user_name,
  actor.email AS actor_email,
  l.*
FROM order_status_logs l
JOIN "StorybookOrder" o ON o.id = l.order_id
JOIN "User" owner ON owner.id = o."userId"
LEFT JOIN "User" actor ON actor.id = l.actor_id;

CREATE OR REPLACE VIEW generation_event_with_email AS
SELECT u.email, u.name AS user_name, e.*
FROM generation_events e
LEFT JOIN "User" u ON u.id = e.user_id;
