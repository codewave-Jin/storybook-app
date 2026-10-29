/**
 * 주문 완료는 현금이 아니라 토큰으로 한다. 토큰 1개 = 1,000원.
 * 배송 정보를 받은 뒤 토큰을 차감하고 주문을 PAID로 바꾼다.
 */
export const PAYMENTS_ENABLED = true;

export const TOKEN_KRW = 1_000;
export const STORYBOOK_PRICE_KRW = 45_000;
export const PHOTO_ALBUM_PRICE_KRW = 5_000;
export const STICKER_SHEET_PRICE_KRW = 5_000;
export const EMOTICON_PACK_PRICE_KRW = 2_000;
export const ORDER_QUANTITY_MIN = 1;
export const ORDER_QUANTITY_MAX = 20;
export const STICKER_SHEET_MIN = 1;
export const STICKER_SHEET_MAX = 10;
export const QUANTITY_DISCOUNT_PER_EXTRA = 0.1;
export const QUANTITY_DISCOUNT_MAX = 0.3;

export function formatKrw(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function tokensForKrw(amountKrw: number) {
  return Math.max(0, Math.round(amountKrw / TOKEN_KRW));
}

export function formatTokens(amount: number) {
  return `${amount.toLocaleString("ko-KR")}토큰`;
}

export const STORYBOOK_PRICE_TOKENS = tokensForKrw(STORYBOOK_PRICE_KRW);
export const PHOTO_ALBUM_PRICE_TOKENS = tokensForKrw(PHOTO_ALBUM_PRICE_KRW);
export const STICKER_SHEET_PRICE_TOKENS = tokensForKrw(STICKER_SHEET_PRICE_KRW);
export const EMOTICON_PACK_TOKENS = tokensForKrw(EMOTICON_PACK_PRICE_KRW);

export function clampOrderQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return ORDER_QUANTITY_MIN;
  }
  return Math.min(
    ORDER_QUANTITY_MAX,
    Math.max(ORDER_QUANTITY_MIN, Math.round(value)),
  );
}

export function clampStickerSheetCount(value: number) {
  if (!Number.isFinite(value)) {
    return STICKER_SHEET_MIN;
  }
  return Math.min(
    STICKER_SHEET_MAX,
    Math.max(STICKER_SHEET_MIN, Math.round(value)),
  );
}

export function quoteStickerOrder(sheetCount: number) {
  const sheets = clampStickerSheetCount(sheetCount);
  return {
    sheetCount: sheets,
    unitPrice: STICKER_SHEET_PRICE_KRW,
    unitTokens: STICKER_SHEET_PRICE_TOKENS,
    total: STICKER_SHEET_PRICE_KRW * sheets,
    totalTokens: STICKER_SHEET_PRICE_TOKENS * sheets,
  };
}

/** 1권 0%, 한 권 늘 때마다 10%p, 최대 30%. */
export function quantityDiscountRate(quantity: number) {
  const extra = Math.max(0, clampOrderQuantity(quantity) - 1);
  return Math.min(QUANTITY_DISCOUNT_MAX, extra * QUANTITY_DISCOUNT_PER_EXTRA);
}

export function quoteStorybookOrder(input: {
  quantity: number;
  includePhotoAlbum: boolean;
}) {
  const quantity = clampOrderQuantity(input.quantity);
  const bookAmount = STORYBOOK_PRICE_KRW * quantity;
  const albumAmount = input.includePhotoAlbum
    ? PHOTO_ALBUM_PRICE_KRW * quantity
    : 0;
  const subtotal = bookAmount + albumAmount;
  const discountRate = quantityDiscountRate(quantity);
  const discountAmount = Math.round(subtotal * discountRate);
  const total = subtotal - discountAmount;
  return {
    quantity,
    unitPrice: STORYBOOK_PRICE_KRW + (input.includePhotoAlbum ? PHOTO_ALBUM_PRICE_KRW : 0),
    bookAmount,
    albumAmount,
    subtotal,
    discountRate,
    discountPercent: Math.round(discountRate * 100),
    discountAmount,
    total,
    bookTokens: tokensForKrw(bookAmount),
    albumTokens: tokensForKrw(albumAmount),
    subtotalTokens: tokensForKrw(subtotal),
    discountTokens: tokensForKrw(discountAmount),
    totalTokens: tokensForKrw(total),
  };
}
