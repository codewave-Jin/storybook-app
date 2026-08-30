"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { setReviewFeaturedFlags } from "@/lib/review-query";

function revalidateLandingReviews() {
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  revalidatePath("/home");
}

export async function setReviewsLandingVisible(
  reviewIds: string[],
  visible: boolean,
) {
  await requireAdmin();

  const ids = [...new Set(reviewIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { error: "리뷰를 선택해 주세요." };
  }

  await setReviewFeaturedFlags(ids, visible);

  revalidateLandingReviews();
  return { success: true, count: ids.length, visible };
}
