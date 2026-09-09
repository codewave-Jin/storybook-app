/**
 * 결제 버튼 노출. true면 스토리북/스티커 모두 결제 UI가 살아난다.
 * 실제 PG는 없고, 누르면 주문을 PAID로 바꾼 뒤 나머지 삽화를 만든다.
 */
export const PAYMENTS_ENABLED = true;

export const STORYBOOK_PRICE_KRW = 45_000;
export const PHOTO_ALBUM_PRICE_KRW = 5_000;
export const ORDER_QUANTITY_MIN = 1;
export const ORDER_QUANTITY_MAX = 20;
export const QUANTITY_DISCOUNT_PER_EXTRA = 0.1;
export const QUANTITY_DISCOUNT_MAX = 0.3;

export function formatKrw(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function clampOrderQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return ORDER_QUANTITY_MIN;
  }
  return Math.min(
    ORDER_QUANTITY_MAX,
    Math.max(ORDER_QUANTITY_MIN, Math.round(value)),
  );
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
  return {
    quantity,
    unitPrice: STORYBOOK_PRICE_KRW + (input.includePhotoAlbum ? PHOTO_ALBUM_PRICE_KRW : 0),
    bookAmount,
    albumAmount,
    subtotal,
    discountRate,
    discountPercent: Math.round(discountRate * 100),
    discountAmount,
    total: subtotal - discountAmount,
  };
}
