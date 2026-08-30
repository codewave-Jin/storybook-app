import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const reviewListInclude = {
  user: { select: { name: true, email: true } },
  images: { orderBy: { sortOrder: "asc" as const }, select: { imageUrl: true } },
  storybookOrder: { include: { template: { select: { title: true } } } },
  stickerOrder: {
    include: {
      template: { select: { label: true } },
      character: { select: { label: true } },
    },
  },
} satisfies Prisma.ReviewInclude;

export async function featuredReviewIds() {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM reviews WHERE is_featured = true
    `;
    return new Set(rows.map((row) => row.id));
  } catch (error) {
    console.error("[reviews] featured flag query failed", error);
    return new Set<string>();
  }
}

export async function setReviewFeaturedFlags(
  reviewIds: string[],
  visible: boolean,
) {
  if (reviewIds.length === 0) {
    return;
  }

  if (visible) {
    await prisma.$executeRaw`
      UPDATE reviews
      SET is_featured = true, featured_at = CURRENT_TIMESTAMP
      WHERE id IN (${Prisma.join(reviewIds)})
    `;
    return;
  }

  await prisma.$executeRaw`
    UPDATE reviews
    SET is_featured = false, featured_at = NULL
    WHERE id IN (${Prisma.join(reviewIds)})
  `;
}
