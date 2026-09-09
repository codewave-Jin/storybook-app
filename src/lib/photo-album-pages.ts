import { prisma } from "@/lib/prisma";
import {
  PHOTO_ALBUM_INITIAL_PAGE_COUNT,
  PHOTO_ALBUM_INITIAL_SPREAD_COUNT,
  PHOTO_ALBUM_LAYOUT,
  PHOTO_ALBUM_MAX_PAGE_COUNT,
  PHOTO_ALBUM_MAX_SPREAD_COUNT,
  albumPageHasPhotos,
  emptyAlbumPhotoPaths,
  leafPhotosFromStored,
  parseAlbumSlotPhotos,
  serializeAlbumSlotPhotos,
  storedPhotosLookLikeSpread,
} from "@/lib/photo-album";

function emptyPaths() {
  return emptyAlbumPhotoPaths(PHOTO_ALBUM_LAYOUT);
}

function storedLeafPaths(
  value: unknown,
  side: "left" | "right" | "self",
) {
  return serializeAlbumSlotPhotos(leafPhotosFromStored(value, side));
}

function leafRows(
  orderId: string,
  count: number,
  sourcePages: Array<{ pageNumber: number; photoPaths: unknown }>,
) {
  return Array.from({ length: count }, (_, index) => {
    const source = sourcePages[Math.floor(index / 2)];
    const side = index % 2 === 0 ? "left" : "right";
    return {
      orderId,
      pageNumber: index + 1,
      layoutId: PHOTO_ALBUM_LAYOUT.id,
      photoPaths: source
        ? storedLeafPaths(source.photoPaths, side)
        : emptyPaths(),
    };
  });
}

async function trimEmptyExtraPages(
  orderId: string,
  pages: Array<{ id: string; pageNumber: number; photoPaths: unknown }>,
) {
  const highestFilled = Math.max(
    0,
    ...pages
      .filter((page) => albumPageHasPhotos(page.photoPaths))
      .map((page) => page.pageNumber),
  );
  const keepThrough = Math.min(
    PHOTO_ALBUM_MAX_PAGE_COUNT,
    Math.max(
      PHOTO_ALBUM_INITIAL_PAGE_COUNT,
      Math.ceil(highestFilled / 2) * 2,
    ),
  );
  const extraIds = pages
    .filter((page) => page.pageNumber > keepThrough)
    .map((page) => page.id);
  if (extraIds.length === 0) {
    return;
  }
  await prisma.photoAlbumPage.deleteMany({
    where: { id: { in: extraIds } },
  });
}

export async function ensureOrderPhotoAlbumPages(orderId: string) {
  const existing = await prisma.photoAlbumPage.findMany({
    where: { orderId },
    orderBy: { pageNumber: "asc" },
    select: {
      id: true,
      pageNumber: true,
      layoutId: true,
      photoPaths: true,
    },
  });

  const shouldSplitSpreads =
    existing.length > 0 &&
    existing.length < PHOTO_ALBUM_INITIAL_PAGE_COUNT &&
    existing.some((page) => storedPhotosLookLikeSpread(page.photoPaths));

  if (shouldSplitSpreads) {
    const leafCount = Math.min(
      PHOTO_ALBUM_MAX_PAGE_COUNT,
      Math.max(PHOTO_ALBUM_INITIAL_PAGE_COUNT, existing.length * 2),
    );
    await prisma.$transaction([
      prisma.photoAlbumPage.deleteMany({ where: { orderId } }),
      prisma.photoAlbumPage.createMany({
        data: leafRows(orderId, leafCount, existing),
      }),
    ]);
    const splitPages = await prisma.photoAlbumPage.findMany({
      where: { orderId },
      orderBy: { pageNumber: "asc" },
      select: { id: true, pageNumber: true, photoPaths: true },
    });
    await trimEmptyExtraPages(orderId, splitPages);
    return;
  }

  const have = new Set(existing.map((page) => page.pageNumber));
  const missing = Array.from(
    { length: PHOTO_ALBUM_INITIAL_PAGE_COUNT },
    (_, index) => index + 1,
  ).filter((pageNumber) => !have.has(pageNumber));

  if (missing.length > 0) {
    await prisma.photoAlbumPage.createMany({
      data: missing.map((pageNumber) => ({
        orderId,
        pageNumber,
        layoutId: PHOTO_ALBUM_LAYOUT.id,
        photoPaths: emptyPaths(),
      })),
    });
  }

  await Promise.all(
    existing.map((page) => {
      const dirty =
        page.layoutId !== PHOTO_ALBUM_LAYOUT.id ||
        storedPhotosLookLikeSpread(page.photoPaths);
      if (!dirty) {
        return Promise.resolve();
      }
      return prisma.photoAlbumPage.update({
        where: { id: page.id },
        data: {
          layoutId: PHOTO_ALBUM_LAYOUT.id,
          photoPaths: storedLeafPaths(page.photoPaths, "self"),
        },
      });
    }),
  );
}

export async function addOrderAlbumSpread(orderId: string) {
  const existing = await prisma.photoAlbumPage.findMany({
    where: { orderId },
    orderBy: { pageNumber: "asc" },
    select: { pageNumber: true },
  });
  const currentMax = Math.max(0, ...existing.map((page) => page.pageNumber));
  if (currentMax >= PHOTO_ALBUM_MAX_PAGE_COUNT) {
    return { error: "펼침은 최대 4면까지 추가할 수 있어요." as const };
  }

  const nextLeft = currentMax + 1;
  const nextRight = currentMax + 2;
  await prisma.photoAlbumPage.createMany({
    data: [
      {
        orderId,
        pageNumber: nextLeft,
        layoutId: PHOTO_ALBUM_LAYOUT.id,
        photoPaths: emptyPaths(),
      },
      {
        orderId,
        pageNumber: nextRight,
        layoutId: PHOTO_ALBUM_LAYOUT.id,
        photoPaths: emptyPaths(),
      },
    ],
  });

  return {
    success: true as const,
    pageCount: nextRight,
    spreadIndex: Math.floor((nextRight - 1) / 2),
  };
}

export async function removeOrderAlbumSpread(
  orderId: string,
  spreadIndex: number,
) {
  if (
    !Number.isInteger(spreadIndex) ||
    spreadIndex < PHOTO_ALBUM_INITIAL_SPREAD_COUNT ||
    spreadIndex >= PHOTO_ALBUM_MAX_SPREAD_COUNT
  ) {
    return { error: "처음 두 펼침은 삭제할 수 없어요." as const };
  }

  const leftNumber = spreadIndex * 2 + 1;
  const rightNumber = leftNumber + 1;
  const targetPages = await prisma.photoAlbumPage.findMany({
    where: { orderId, pageNumber: { in: [leftNumber, rightNumber] } },
    select: { id: true, photoPaths: true },
  });

  if (targetPages.length === 0) {
    return { error: "삭제할 펼침이 없습니다." as const };
  }

  const laterPages = await prisma.photoAlbumPage.findMany({
    where: { orderId, pageNumber: { gt: rightNumber } },
    orderBy: { pageNumber: "asc" },
    select: { id: true, pageNumber: true },
  });

  const photoPaths = targetPages.flatMap((page) =>
    Object.values(parseAlbumSlotPhotos(page.photoPaths)).map((photo) => photo.path),
  );

  await prisma.$transaction([
    prisma.photoAlbumPage.deleteMany({
      where: { id: { in: targetPages.map((page) => page.id) } },
    }),
    ...laterPages.map((page) =>
      prisma.photoAlbumPage.update({
        where: { id: page.id },
        data: { pageNumber: page.pageNumber - 2 },
      }),
    ),
  ]);

  const remaining = await prisma.photoAlbumPage.count({ where: { orderId } });
  return {
    success: true as const,
    photoPaths,
    spreadIndex: Math.max(0, Math.ceil(remaining / 2) - 1),
  };
}
