import { AdminReviewsBoard } from "@/components/admin/AdminReviewsBoard";
import { signReviewImageUrls } from "@/lib/review-images";
import { featuredReviewIds, reviewListInclude } from "@/lib/review-query";
import { reviewProductTitle } from "@/lib/reviews";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function reviewsHref(filter?: string) {
  return filter && filter !== "ALL" ? `/admin/reviews?filter=${filter}` : "/admin/reviews";
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const featuredOnly = searchParams.filter === "featured";

  let reviews: Awaited<ReturnType<typeof prisma.review.findMany>> = [];
  let featuredIds = new Set<string>();
  let loadError: string | null = null;

  try {
    [reviews, featuredIds] = await Promise.all([
      prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        include: reviewListInclude,
      }),
      featuredReviewIds(),
    ]);
  } catch (error) {
    console.error("[admin/reviews] load failed", error);
    loadError =
      error instanceof Error
        ? error.message
        : "리뷰 목록을 불러오지 못했습니다.";
  }

  const visibleReviews = featuredOnly
    ? reviews.filter((review) => featuredIds.has(review.id))
    : [...reviews].sort(
        (left, right) =>
          Number(featuredIds.has(right.id)) - Number(featuredIds.has(left.id)),
      );

  const rows = await Promise.all(
    visibleReviews.map(async (review) => ({
      id: review.id,
      userName: review.user.name,
      userEmail: review.user.email,
      productTitle: reviewProductTitle(review),
      rating: review.rating,
      content: review.content,
      images: await signReviewImageUrls(
        review.images.map((image) => image.imageUrl),
      ),
      isFeatured: featuredIds.has(review.id),
      createdAt: review.createdAt.toISOString(),
    })),
  );

  const filters = [
    { value: "ALL", label: "전체" },
    { value: "featured", label: "노출중" },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">리뷰 관리</h1>
      <p className="mt-1 text-sm text-stone-500">
        리뷰를 선택한 뒤 노출하면 랜딩페이지에 표시됩니다.
      </p>
      {loadError ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active =
            filter.value === "ALL" ? !featuredOnly : featuredOnly;
          return (
            <a
              key={filter.value}
              href={reviewsHref(filter.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                active
                  ? "bg-stone-800 text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100",
              )}
            >
              {filter.label}
            </a>
          );
        })}
      </div>

      <AdminReviewsBoard reviews={rows} />
    </div>
  );
}
