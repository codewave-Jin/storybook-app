import { signReviewImageUrls } from "@/lib/review-images";
import { featuredReviewIds, reviewListInclude } from "@/lib/review-query";
import { reviewProductTitle, type LandingReviewCard } from "@/lib/reviews";
import { prisma } from "@/lib/prisma";

export async function getFeaturedLandingReviews(): Promise<LandingReviewCard[]> {
  const featuredIds = [...(await featuredReviewIds())];
  if (featuredIds.length === 0) {
    return [];
  }

  const reviews = await prisma.review.findMany({
    where: { id: { in: featuredIds } },
    orderBy: { createdAt: "desc" },
    include: reviewListInclude,
  });

  return Promise.all(
    reviews.map(async (review) => {
      const images = await signReviewImageUrls(
        review.images.map((image) => image.imageUrl),
      );
      return {
        id: review.id,
        name: review.user.name,
        role: reviewProductTitle(review),
        body: review.content,
        image: images[0] ?? null,
        rating: review.rating,
      };
    }),
  );
}
