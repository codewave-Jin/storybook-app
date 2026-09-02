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

export function isReviewEditable(updatedAt: Date, now = new Date()) {
  return now.getTime() - updatedAt.getTime() <= REVIEW_EDIT_WINDOW_MS;
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
