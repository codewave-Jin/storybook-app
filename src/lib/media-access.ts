import { prisma } from "@/lib/prisma";
import { ownerIdFromStoredPath } from "@/lib/media-paths";

function jsonContainsSrc(src: string) {
  return `%${src.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

async function jsonPathOwnedByUser(userId: string, src: string) {
  const like = jsonContainsSrc(src);
  const [illustration, asset, album] = await Promise.all([
    prisma.$queryRaw<{ ok: number }[]>`
      SELECT 1 AS ok
      FROM "Illustration" i
      JOIN "StorybookOrder" o ON o.id = i."orderId"
      WHERE o."userId" = ${userId}
        AND i."imageVersions"::text LIKE ${like}
      LIMIT 1
    `,
    prisma.$queryRaw<{ ok: number }[]>`
      SELECT 1 AS ok
      FROM "CharacterAsset" a
      JOIN "Character" c ON c.id = a."characterId"
      WHERE c."userId" = ${userId}
        AND a."regenUploads"::text LIKE ${like}
      LIMIT 1
    `,
    prisma.$queryRaw<{ ok: number }[]>`
      SELECT 1 AS ok
      FROM "PhotoAlbumPage" p
      JOIN "StorybookOrder" o ON o.id = p."orderId"
      WHERE o."userId" = ${userId}
        AND p."photoPaths"::text LIKE ${like}
      LIMIT 1
    `,
  ]);

  return illustration.length > 0 || asset.length > 0 || album.length > 0;
}

export async function userCanAccessMedia(options: {
  userId: string;
  isAdmin: boolean;
  src: string;
}) {
  if (options.isAdmin) {
    return true;
  }

  const ownerId = ownerIdFromStoredPath(options.src);
  if (ownerId) {
    return ownerId === options.userId;
  }

  const src = options.src;
  const userId = options.userId;

  const character = await prisma.character.findFirst({
    where: {
      userId,
      OR: [{ originalPhotoPath: src }, { generatedImagePath: src }],
    },
    select: { id: true },
  });
  if (character) {
    return true;
  }

  const sticker = await prisma.stickerOrder.findFirst({
    where: {
      userId,
      OR: [
        { previewImagePath: src },
        { finalImagePath: src },
        { compositeImagePath: src },
      ],
    },
    select: { id: true },
  });
  if (sticker) {
    return true;
  }

  const illustration = await prisma.illustration.findFirst({
    where: {
      order: { userId },
      OR: [
        { imagePath: src },
        { sceneImagePath: src },
        { upscaledImagePath: src },
      ],
    },
    select: { id: true },
  });
  if (illustration) {
    return true;
  }

  const asset = await prisma.characterAsset.findFirst({
    where: {
      character: { userId },
      OR: [
        { rawPortraitUrl: src },
        { styledImageUrl: src },
        { regenInputUrl: src },
      ],
    },
    select: { id: true },
  });
  if (asset) {
    return true;
  }

  return jsonPathOwnedByUser(userId, src);
}
