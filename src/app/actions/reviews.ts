"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteReviewImageFiles,
  uploadReviewImages,
  validateReviewImageFile,
} from "@/lib/review-images";
import {
  REVIEW_MAX_CONTENT,
  REVIEW_MAX_IMAGES,
  REVIEW_MIN_CONTENT,
  isReviewEditable,
} from "@/lib/reviews";
import { STICKER_REVIEW_PRODUCT_ID } from "@/lib/templates";

export type ReviewFormState = {
  error?: string;
  success?: boolean;
} | undefined;

function revalidateReviewPages() {
  revalidatePath("/mypage");
  revalidatePath("/mypage/reviews");
  revalidatePath("/");
  revalidatePath("/home");
}

function parseRatingContent(formData: FormData) {
  const rating = Number(formData.get("rating"));
  const content = String(formData.get("content") ?? "").trim();
  return { rating, content };
}

function validateReviewFields(rating: number, content: string): string | null {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "별점을 1~5점으로 선택해 주세요.";
  }
  if (content.length < REVIEW_MIN_CONTENT) {
    return `리뷰는 ${REVIEW_MIN_CONTENT}자 이상 작성해 주세요.`;
  }
  if (content.length > REVIEW_MAX_CONTENT) {
    return `리뷰는 ${REVIEW_MAX_CONTENT}자 이내로 작성해 주세요.`;
  }
  return null;
}

function parseImageFiles(formData: FormData): File[] | { error: string } {
  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length > REVIEW_MAX_IMAGES) {
    return { error: `사진은 최대 ${REVIEW_MAX_IMAGES}장까지 첨부할 수 있습니다.` };
  }

  for (const file of files) {
    const imageError = validateReviewImageFile(file);
    if (imageError) {
      return { error: imageError };
    }
  }

  return files;
}

async function saveReviewImages(userId: string, reviewId: string, files: File[]) {
  if (files.length === 0) {
    return;
  }

  const urls = await uploadReviewImages(userId, reviewId, files);
  try {
    await prisma.reviewImage.createMany({
      data: urls.map((imageUrl, index) => ({
        reviewId,
        imageUrl,
        sortOrder: index,
      })),
    });
  } catch (error) {
    await deleteReviewImageFiles(urls);
    throw error;
  }
}

export async function createReview(
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "로그인이 필요합니다." };
  }

  const { rating, content } = parseRatingContent(formData);
  const fieldError = validateReviewFields(rating, content);
  if (fieldError) {
    return { error: fieldError };
  }

  const images = parseImageFiles(formData);
  if ("error" in images) {
    return { error: images.error };
  }

  const orderKind = String(formData.get("orderKind") ?? "");
  const orderId = String(formData.get("orderId") ?? "").trim();

  if (!orderId || (orderKind !== "storybook" && orderKind !== "sticker")) {
    return { error: "리뷰를 남길 주문을 선택해 주세요." };
  }

  const userId = session.user.id;

  try {
    const reviewId = await prisma.$transaction(async (tx) => {
      if (orderKind === "storybook") {
        const order = await tx.storybookOrder.findFirst({
          where: {
            id: orderId,
            userId,
            paymentStatus: "PAID",
            productionStatus: "COMPLETED",
          },
          select: { id: true, templateId: true, review: { select: { id: true } } },
        });

        if (!order) {
          throw new Error("ORDER_NOT_FOUND");
        }
        if (order.review) {
          throw new Error("REVIEW_EXISTS");
        }

        const created = await tx.review.create({
          data: {
            userId,
            rating,
            content,
            storybookOrderId: order.id,
            productId: order.templateId,
          },
          select: { id: true },
        });
        return created.id;
      }

      const order = await tx.stickerOrder.findFirst({
        where: {
          id: orderId,
          userId,
          paymentStatus: "PAID",
          productionStatus: "COMPLETED",
        },
        select: { id: true, review: { select: { id: true } } },
      });

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }
      if (order.review) {
        throw new Error("REVIEW_EXISTS");
      }

      const created = await tx.review.create({
        data: {
          userId,
          rating,
          content,
          stickerOrderId: order.id,
          productId: STICKER_REVIEW_PRODUCT_ID,
        },
        select: { id: true },
      });
      return created.id;
    });

    try {
      await saveReviewImages(userId, reviewId, images);
    } catch (uploadError) {
      await prisma.review.delete({ where: { id: reviewId } }).catch(() => undefined);
      throw uploadError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ORDER_NOT_FOUND") {
      return { error: "배송이 완료된 본인 주문만 리뷰할 수 있습니다." };
    }
    if (message === "REVIEW_EXISTS") {
      return { error: "이미 이 주문에 대한 리뷰가 있습니다." };
    }
    if (message.includes("Supabase 설정")) {
      return { error: message };
    }
    if (
      message.includes("사진") ||
      message.includes("업로드") ||
      message.includes("JPG")
    ) {
      return { error: message };
    }
    return { error: "리뷰 등록에 실패했습니다. 주문이 완료되었는지 확인해 주세요." };
  }

  revalidateReviewPages();
  redirect("/mypage/reviews?tab=mine");
}

export async function updateReview(
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "로그인이 필요합니다." };
  }

  const reviewId = String(formData.get("reviewId") ?? "");
  const { rating, content } = parseRatingContent(formData);
  const fieldError = validateReviewFields(rating, content);
  if (fieldError) {
    return { error: fieldError };
  }

  const newFiles = parseImageFiles(formData);
  if ("error" in newFiles) {
    return { error: newFiles.error };
  }

  const keepImageIds = new Set(
    formData
      .getAll("keepImageId")
      .map((value) => String(value))
      .filter(Boolean),
  );

  const existing = await prisma.review.findFirst({
    where: { id: reviewId, userId: session.user.id },
    select: {
      id: true,
      updatedAt: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, imageUrl: true },
      },
    },
  });
  if (!existing) {
    return { error: "리뷰를 찾을 수 없습니다." };
  }
  if (!isReviewEditable(existing.updatedAt)) {
    return { error: "작성 후 7일이 지나 수정할 수 없습니다." };
  }

  const keptImages = existing.images.filter((image) => keepImageIds.has(image.id));
  if (keptImages.length + newFiles.length > REVIEW_MAX_IMAGES) {
    return { error: `사진은 최대 ${REVIEW_MAX_IMAGES}장까지 첨부할 수 있습니다.` };
  }

  const removedImages = existing.images.filter((image) => !keepImageIds.has(image.id));

  try {
    const uploadedUrls = await uploadReviewImages(
      session.user.id,
      reviewId,
      newFiles,
    );

    try {
      await prisma.$transaction(async (tx) => {
        if (removedImages.length > 0) {
          await tx.reviewImage.deleteMany({
            where: {
              reviewId,
              id: { in: removedImages.map((image) => image.id) },
            },
          });
        }

        await Promise.all(
          keptImages.map((image, index) =>
            tx.reviewImage.update({
              where: { id: image.id },
              data: { sortOrder: index },
            }),
          ),
        );

        if (uploadedUrls.length > 0) {
          await tx.reviewImage.createMany({
            data: uploadedUrls.map((imageUrl, index) => ({
              reviewId,
              imageUrl,
              sortOrder: keptImages.length + index,
            })),
          });
        }

        await tx.review.update({
          where: { id: reviewId },
          data: { rating, content },
        });
      });
    } catch (error) {
      await deleteReviewImageFiles(uploadedUrls);
      throw error;
    }

    await deleteReviewImageFiles(removedImages.map((image) => image.imageUrl));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Supabase 설정")) {
      return { error: message };
    }
    if (
      message.includes("사진") ||
      message.includes("업로드") ||
      message.includes("JPG")
    ) {
      return { error: message };
    }
    return { error: "리뷰 수정에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidateReviewPages();
  redirect("/mypage/reviews?tab=mine");
}

export async function deleteReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }

  const reviewId = String(formData.get("reviewId") ?? "");
  const existing = await prisma.review.findFirst({
    where: { id: reviewId, userId: session.user.id },
    select: {
      id: true,
      images: { select: { imageUrl: true } },
    },
  });
  if (!existing) {
    return;
  }

  await prisma.review.delete({ where: { id: existing.id } });
  await deleteReviewImageFiles(existing.images.map((image) => image.imageUrl));

  revalidateReviewPages();
  redirect("/mypage/reviews?tab=mine");
}
