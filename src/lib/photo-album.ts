export type AlbumSlot = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate?: number;
};

export type AlbumLayout = {
  id: string;
  title: string;
  slots: AlbumSlot[];
};

export const PHOTO_ALBUM_LEAF_SLOT_IDS = ["a", "b", "c", "d"] as const;

/** 각 장(정사각) 안 배치. 펼치면 왼쪽·오른쪽 장에 같은 칸을 쓴다. */
export const PHOTO_ALBUM_LAYOUT: AlbumLayout = {
  id: "staggered",
  title: "네 칸",
  slots: [
    { id: "a", left: 6, top: 6, width: 55, height: 42.5 },
    { id: "b", left: 64, top: 6, width: 30, height: 42.5 },
    { id: "c", left: 6, top: 51.5, width: 30, height: 42.5 },
    { id: "d", left: 39, top: 51.5, width: 55, height: 42.5 },
  ],
};

/** 처음 펼침 2면. 최대 펼침 4면. 하단 1/4는 펼침 번호. */
export const PHOTO_ALBUM_INITIAL_PAGE_COUNT = 4;
export const PHOTO_ALBUM_MAX_PAGE_COUNT = 8;
export const PHOTO_ALBUM_INITIAL_SPREAD_COUNT =
  PHOTO_ALBUM_INITIAL_PAGE_COUNT / 2;
export const PHOTO_ALBUM_MAX_SPREAD_COUNT = PHOTO_ALBUM_MAX_PAGE_COUNT / 2;
export const PHOTO_ALBUM_PAGE_COUNT = PHOTO_ALBUM_MAX_PAGE_COUNT;
export const PHOTO_ALBUM_SPREAD_COUNT = PHOTO_ALBUM_MAX_SPREAD_COUNT;

export const PHOTO_ALBUM_LAYOUTS: AlbumLayout[] = Array.from(
  { length: PHOTO_ALBUM_MAX_PAGE_COUNT },
  () => PHOTO_ALBUM_LAYOUT,
);

export function spreadSlotsForLeaf(side: "left" | "right"): AlbumSlot[] {
  const offset = side === "left" ? 0 : 50;
  return PHOTO_ALBUM_LAYOUT.slots.map((slot) => ({
    ...slot,
    left: offset + slot.left * 0.5,
    width: slot.width * 0.5,
  }));
}

export type AlbumSpreadPair<T extends { pageNumber: number }> = {
  spreadIndex: number;
  leftPage?: T;
  rightPage?: T;
};

export function pairAlbumPagesIntoSpreads<T extends { pageNumber: number }>(
  pages: T[],
): AlbumSpreadPair<T>[] {
  const byNumber = new Map(pages.map((page) => [page.pageNumber, page]));
  const maxPage = Math.max(0, ...pages.map((page) => page.pageNumber));
  const spreadCount = Math.min(
    PHOTO_ALBUM_MAX_SPREAD_COUNT,
    Math.ceil(maxPage / 2),
  );
  const spreads: AlbumSpreadPair<T>[] = [];
  for (let spreadIndex = 0; spreadIndex < spreadCount; spreadIndex += 1) {
    const leftNumber = spreadIndex * 2 + 1;
    const rightNumber = leftNumber + 1;
    const leftPage = byNumber.get(leftNumber);
    const rightPage = byNumber.get(rightNumber);
    if (!leftPage && !rightPage) {
      continue;
    }
    spreads.push({ spreadIndex, leftPage, rightPage });
  }
  return spreads;
}

function photoAt(
  photos: Record<string, AlbumSlotPhoto>,
  keys: string[],
) {
  for (const key of keys) {
    if (photos[key]) {
      return photos[key];
    }
  }
  return undefined;
}

export function storedPhotosLookLikeSpread(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.keys(value).some(
    (key) => key.startsWith("left-") || key.startsWith("right-"),
  );
}

export function leafPhotosFromStored(
  value: unknown,
  side: "left" | "right" | "self",
): Record<string, AlbumSlotPhoto> {
  const photos = parseAlbumSlotPhotos(value);
  const out: Record<string, AlbumSlotPhoto> = {};
  for (const id of PHOTO_ALBUM_LEAF_SLOT_IDS) {
    const hit =
      side === "right"
        ? photoAt(photos, [`right-${id}`])
        : side === "left"
          ? photoAt(photos, [`left-${id}`, id])
          : photoAt(photos, [id, `left-${id}`]);
    if (hit) {
      out[id] = hit;
    }
  }
  if (side !== "right" && !out.a && photos.main) {
    out.a = photos.main;
  }
  if (side === "left" && !out.a && photos.left) {
    out.a = photos.left;
  }
  if (side === "right" && !out.a && photos.right) {
    out.a = photos.right;
  }
  return out;
}

export function albumLayoutById(layoutId: string) {
  if (layoutId && layoutId !== PHOTO_ALBUM_LAYOUT.id) {
    return PHOTO_ALBUM_LAYOUT;
  }
  return PHOTO_ALBUM_LAYOUT;
}

export type AlbumSlotPhoto = {
  path: string;
  x: number;
  y: number;
};

export function clampAlbumFocus(value: number) {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.min(100, Math.max(0, value));
}

export function coverOverflowPx(
  boxWidth: number,
  boxHeight: number,
  imageWidth: number,
  imageHeight: number,
) {
  if (boxWidth <= 0 || boxHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return { x: 0, y: 0 };
  }
  const scale = Math.max(boxWidth / imageWidth, boxHeight / imageHeight);
  return {
    x: Math.max(0, imageWidth * scale - boxWidth),
    y: Math.max(0, imageHeight * scale - boxHeight),
  };
}

export function panCoverFocus(
  current: { x: number; y: number },
  delta: { x: number; y: number },
  overflow: { x: number; y: number },
) {
  return {
    x:
      overflow.x <= 0.5
        ? 50
        : clampAlbumFocus(current.x - (delta.x / overflow.x) * 100),
    y:
      overflow.y <= 0.5
        ? 50
        : clampAlbumFocus(current.y - (delta.y / overflow.y) * 100),
  };
}

function parseSlotPhoto(entry: unknown): AlbumSlotPhoto | null {
  if (typeof entry === "string" && entry.trim()) {
    return { path: entry.trim(), x: 50, y: 50 };
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }
  const record = entry as { path?: unknown; x?: unknown; y?: unknown };
  if (typeof record.path !== "string" || !record.path.trim()) {
    return null;
  }
  return {
    path: record.path.trim(),
    x: clampAlbumFocus(typeof record.x === "number" ? record.x : 50),
    y: clampAlbumFocus(typeof record.y === "number" ? record.y : 50),
  };
}

export function parseAlbumSlotPhotos(
  value: unknown,
): Record<string, AlbumSlotPhoto> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const photos: Record<string, AlbumSlotPhoto> = {};
  for (const [key, entry] of Object.entries(value)) {
    const photo = parseSlotPhoto(entry);
    if (photo) {
      photos[key] = photo;
    }
  }
  return photos;
}

export function serializeAlbumSlotPhotos(
  photos: Record<string, AlbumSlotPhoto>,
): Record<string, { path: string; x: number; y: number }> {
  return Object.fromEntries(
    Object.entries(photos)
      .filter(([, photo]) => photo.path)
      .map(([id, photo]) => [
        id,
        {
          path: photo.path,
          x: clampAlbumFocus(photo.x),
          y: clampAlbumFocus(photo.y),
        },
      ]),
  );
}

export function parseAlbumPhotoPaths(value: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(parseAlbumSlotPhotos(value)).map(([id, photo]) => [
      id,
      photo.path,
    ]),
  );
}

export function emptyAlbumPhotoPaths(layout: AlbumLayout): Record<string, string> {
  return Object.fromEntries(layout.slots.map((slot) => [slot.id, ""]));
}

export function countAlbumFilledSlots(
  pages: Array<{ layoutId: string; photoPaths: unknown }>,
) {
  let filled = 0;
  let required = 0;
  for (const page of pages) {
    const layout = albumLayoutById(page.layoutId);
    const photos = parseAlbumSlotPhotos(page.photoPaths);
    required += layout.slots.length;
    filled += layout.slots.filter((slot) => Boolean(photos[slot.id]?.path)).length;
  }
  return { filled, required };
}

export function isAlbumComplete(
  pages: Array<{ layoutId: string; photoPaths: unknown }>,
) {
  const { filled, required } = countAlbumFilledSlots(pages);
  return required > 0 && filled === required;
}

export function albumPageHasPhotos(photoPaths: unknown) {
  return Object.values(parseAlbumSlotPhotos(photoPaths)).some((photo) =>
    Boolean(photo.path),
  );
}
