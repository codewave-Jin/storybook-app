export const REVIEW_MIN_CONTENT = 10;
export const REVIEW_MAX_CONTENT = 500;
export const REVIEW_MAX_IMAGES = 5;
export const REVIEW_EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const REVIEW_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const REVIEW_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Storybook reviews open only after admin marks fulfillment as delivered. */
export const STORYBOOK_REVIEWABLE_WHERE = {
  paymentStatus: "PAID" as const,
  fulfillmentStatus: "DELIVERED" as const,
};

/** Stickers have no fulfillment pipeline; production complete is the ship-done signal. */
export const STICKER_REVIEWABLE_WHERE = {
  paymentStatus: "PAID" as const,
  productionStatus: "COMPLETED" as const,
};

export function isReviewEditable(updatedAt: Date, now = new Date()) {
  return now.getTime() - updatedAt.getTime() <= REVIEW_EDIT_WINDOW_MS;
}

export function canWriteStorybookReview(order: {
  paymentStatus: string;
  fulfillmentStatus?: string | null;
  reviewId?: string | null;
}) {
  return (
    !order.reviewId &&
    order.paymentStatus === STORYBOOK_REVIEWABLE_WHERE.paymentStatus &&
    order.fulfillmentStatus === STORYBOOK_REVIEWABLE_WHERE.fulfillmentStatus
  );
}

export function canWriteStickerReview(order: {
  paymentStatus: string;
  productionStatus: string;
  reviewId?: string | null;
}) {
  return (
    !order.reviewId &&
    order.paymentStatus === STICKER_REVIEWABLE_WHERE.paymentStatus &&
    order.productionStatus === STICKER_REVIEWABLE_WHERE.productionStatus
  );
}

export function reviewWriteHref(kind: "storybook" | "sticker", orderId: string) {
  return `/mypage/reviews/write?kind=${kind}&orderId=${orderId}`;
}

export function reviewProductTitle(review: {
  storybookOrder?: { template: { title: string } } | null;
  stickerOrder?: {
    border?: { label: string } | null;
    template: { label: string } | null;
    character: { label: string };
  } | null;
}) {
  if (review.storybookOrder) {
    return review.storybookOrder.template.title;
  }
  if (review.stickerOrder) {
    const extra =
      review.stickerOrder.border?.label?.trim() ||
      review.stickerOrder.template?.label?.trim() ||
      null;
    return extra
      ? `${review.stickerOrder.character.label} · ${extra}`
      : review.stickerOrder.character.label;
  }
  return "리뷰";
}

export type LandingReviewCard = {
  id: string;
  name: string;
  role: string;
  body: string;
  image: string | null;
  rating: number;
};
