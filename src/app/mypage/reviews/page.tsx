import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { ReviewBoard } from "@/components/mypage/ReviewBoard";
import { formatDateTime } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { signReviewImageUrls } from "@/lib/review-images";
import { isReviewEditable } from "@/lib/reviews";

export default async function MyReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/mypage/reviews");
  }

  const userId = session.user.id;

  const [user, storybookOrders, stickerOrders, reviews] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.storybookOrder.findMany({
      where: {
        userId,
        paymentStatus: "PAID",
        productionStatus: "COMPLETED",
        review: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        template: { select: { title: true } },
        illustrations: {
          where: { pageType: "COVER" },
          take: 1,
          select: { imagePath: true },
        },
      },
    }),
    prisma.stickerOrder.findMany({
      where: {
        userId,
        paymentStatus: "PAID",
        productionStatus: "COMPLETED",
        review: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        template: { select: { label: true } },
        character: {
          select: {
            label: true,
            generatedImagePath: true,
            originalPhotoPath: true,
          },
        },
      },
    }),
    prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        images: { orderBy: { sortOrder: "asc" }, select: { imageUrl: true } },
        storybookOrder: { include: { template: { select: { title: true } } } },
        stickerOrder: {
          include: {
            template: { select: { label: true } },
            character: { select: { label: true } },
          },
        },
      },
    }),
  ]);

  if (!user) {
    redirect(
      "/api/auth/force-logout?callbackUrl=/login%3FcallbackUrl%3D%2Fmypage%2Freviews",
    );
  }

  const writable = [
    ...storybookOrders.map((order) => ({
      id: order.id,
      kind: "storybook" as const,
      title: order.template.title,
      thumbnail: order.illustrations[0]?.imagePath ?? null,
      completedAt: formatDateTime(order.createdAt),
    })),
    ...stickerOrders.map((order) => ({
      id: order.id,
      kind: "sticker" as const,
      title: `${order.character.label} · ${order.template.label}`,
      thumbnail:
        order.previewImagePath ??
        order.character.generatedImagePath ??
        order.character.originalPhotoPath,
      completedAt: formatDateTime(order.createdAt),
    })),
  ];

  const written = await Promise.all(
    reviews.map(async (review) => ({
      id: review.id,
      rating: review.rating,
      content: review.content,
      canEdit: isReviewEditable(review.updatedAt),
      title:
        review.storybookOrder?.template.title ??
        (review.stickerOrder
          ? `${review.stickerOrder.character.label} · ${review.stickerOrder.template.label}`
          : "리뷰"),
      images: await signReviewImageUrls(review.images.map((image) => image.imageUrl)),
    })),
  );

  return (
    <MyPageShell title="내 리뷰" user={user}>
      <Suspense>
        <ReviewBoard writable={writable} written={written} />
      </Suspense>
    </MyPageShell>
  );
}
