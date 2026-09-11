import { PrismaClient } from "@prisma/client";
import { collectIllustrationAssetPaths } from "../src/lib/illustration-versions";
import { deleteReviewImageFiles } from "../src/lib/review-images";
import {
  deleteIllustrationFile,
  deletePublicFile,
  deleteStickerFile,
} from "../src/lib/uploads";

const prisma = new PrismaClient();

async function countUserData() {
  const [
    users,
    admins,
    characters,
    characterAssets,
    orders,
    illustrations,
    albumPages,
    stickerOrders,
    reviews,
    reviewImages,
    generationEvents,
    gptJobs,
  ] = await Promise.all([
    prisma.user.count({ where: { isAdmin: false } }),
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.character.count(),
    prisma.characterAsset.count(),
    prisma.storybookOrder.count(),
    prisma.illustration.count(),
    prisma.photoAlbumPage.count(),
    prisma.stickerOrder.count(),
    prisma.review.count(),
    prisma.reviewImage.count(),
    prisma.generationEvent.count(),
    prisma.gptImageJob.count(),
  ]);

  return {
    users,
    admins,
    characters,
    characterAssets,
    orders,
    illustrations,
    albumPages,
    stickerOrders,
    reviews,
    reviewImages,
    generationEvents,
    gptJobs,
  };
}

async function collectUploadPaths() {
  const [characters, assets, illustrations, albumPages, stickerOrders, reviewImages] =
    await Promise.all([
      prisma.character.findMany({
        select: { originalPhotoPath: true, generatedImagePath: true },
      }),
      prisma.characterAsset.findMany({
        select: { rawPortraitUrl: true, styledImageUrl: true },
      }),
      prisma.illustration.findMany({
        select: {
          imagePath: true,
          sceneImagePath: true,
          upscaledImagePath: true,
          imageVersions: true,
        },
      }),
      prisma.photoAlbumPage.findMany({
        select: { photoPaths: true },
      }),
      prisma.stickerOrder.findMany({
        select: {
          previewImagePath: true,
          finalImagePath: true,
          compositeImagePath: true,
        },
      }),
      prisma.reviewImage.findMany({
        select: { imageUrl: true },
      }),
    ]);

  const paths: string[] = [];
  for (const character of characters) {
    if (character.originalPhotoPath) paths.push(character.originalPhotoPath);
    if (character.generatedImagePath) paths.push(character.generatedImagePath);
  }
  for (const asset of assets) {
    if (asset.rawPortraitUrl) paths.push(asset.rawPortraitUrl);
    if (asset.styledImageUrl) paths.push(asset.styledImageUrl);
  }
  for (const illustration of illustrations) {
    paths.push(...collectIllustrationAssetPaths(illustration));
  }
  for (const page of albumPages) {
    if (Array.isArray(page.photoPaths)) {
      for (const item of page.photoPaths) {
        if (typeof item === "string" && item.trim()) {
          paths.push(item);
        }
      }
    }
  }
  for (const order of stickerOrders) {
    if (order.previewImagePath) paths.push(order.previewImagePath);
    if (order.finalImagePath) paths.push(order.finalImagePath);
    if (order.compositeImagePath) paths.push(order.compositeImagePath);
  }

  return {
    uploadPaths: [...new Set(paths)],
    reviewUrls: reviewImages.map((image) => image.imageUrl),
  };
}

async function deleteCollectedFiles(paths: string[]) {
  for (const path of paths) {
    try {
      if (path.includes("/uploads/illustrations/") || path.includes("/illustrations/")) {
        await deleteIllustrationFile(path);
        continue;
      }
      if (path.includes("/uploads/stickers/") || path.includes("/stickers/")) {
        await deleteStickerFile(path);
        continue;
      }
      await deletePublicFile(path);
    } catch {
      // Best-effort cleanup; DB wipe still proceeds.
    }
  }
}

async function main() {
  const before = await countUserData();
  console.log("wipe before", before);

  const { uploadPaths, reviewUrls } = await collectUploadPaths();
  console.log(`deleting ${uploadPaths.length} stored files and ${reviewUrls.length} review images`);
  await deleteCollectedFiles(uploadPaths);
  await deleteReviewImageFiles(reviewUrls);

  await prisma.$transaction([
    prisma.reviewImage.deleteMany(),
    prisma.review.deleteMany(),
    prisma.orderStatusLog.deleteMany(),
    prisma.illustration.deleteMany(),
    prisma.photoAlbumPage.deleteMany(),
    prisma.storybookOrder.deleteMany(),
    prisma.stickerOrder.deleteMany(),
    prisma.characterAsset.deleteMany(),
    prisma.character.deleteMany(),
    prisma.tokenTransaction.deleteMany(),
    prisma.tokenBalance.deleteMany(),
    prisma.generationEvent.deleteMany(),
    prisma.gptImageUsage.deleteMany(),
    prisma.gptImageJob.deleteMany(),
    prisma.user.deleteMany({ where: { isAdmin: false } }),
  ]);

  const after = await countUserData();
  console.log("wipe after", after);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
