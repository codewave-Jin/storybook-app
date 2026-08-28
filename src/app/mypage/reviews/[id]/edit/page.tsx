import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { ReviewForm } from "@/components/mypage/ReviewForm";
import { prisma } from "@/lib/prisma";
import { signReviewImageUrls } from "@/lib/review-images";
import { isReviewEditable } from "@/lib/reviews";

export default async function EditReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/mypage/reviews/${params.id}/edit`);
  }

  const [user, review] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    }),
    prisma.review.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: {
        id: true,
        rating: true,
        content: true,
        updatedAt: true,
        images: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, imageUrl: true },
        },
      },
    }),
  ]);

  if (!user) {
    redirect(
      "/api/auth/force-logout?callbackUrl=/login%3FcallbackUrl%3D%2Fmypage%2Freviews",
    );
  }
  if (!review) {
    notFound();
  }

  if (!isReviewEditable(review.updatedAt)) {
    return (
      <MyPageShell title="리뷰 수정" user={user}>
        <Link
          href="/mypage/reviews?tab=mine"
          className="mb-4 inline-flex text-sm font-medium text-[#E07A5F] hover:underline"
        >
          ← 내 리뷰
        </Link>
        <p className="rounded-[24px] bg-white px-4 py-10 text-center text-sm text-stone-500 shadow-sm ring-1 ring-stone-200">
          작성 후 7일이 지나 이 리뷰는 수정할 수 없습니다.
        </p>
      </MyPageShell>
    );
  }

  const imageUrls = await signReviewImageUrls(
    review.images.map((image) => image.imageUrl),
  );

  return (
    <MyPageShell title="리뷰 수정" user={user}>
      <Link
        href="/mypage/reviews?tab=mine"
        className="mb-4 inline-flex text-sm font-medium text-[#E07A5F] hover:underline"
      >
        ← 내 리뷰
      </Link>
      <ReviewForm
        review={{
          id: review.id,
          rating: review.rating,
          content: review.content,
          images: review.images.map((image, index) => ({
            id: image.id,
            url: imageUrls[index] ?? image.imageUrl,
          })),
        }}
      />
    </MyPageShell>
  );
}
