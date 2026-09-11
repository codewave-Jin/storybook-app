import sharp from "sharp";
import {
  PHOTO_ALBUM_LAYOUT,
  clampAlbumFocus,
  leafPhotosFromStored,
  pairAlbumPagesIntoSpreads,
  type AlbumSlot,
  type AlbumSlotPhoto,
} from "@/lib/photo-album";
import { readStoredAsset } from "@/lib/uploads";

const PAGE_BG = { r: 243, g: 238, b: 230 };
const MAT_WHITE = { r: 255, g: 255, b: 255 };
const EMPTY_INNER = { r: 238, g: 231, b: 220 };
const RING = { r: 214, g: 211, b: 209 };

/** 한 장(정사각) 인쇄 해상도. 펼침은 가로로 두 장. */
export const ALBUM_PRINT_PAGE_SIZE = 2400;

type AlbumPrintPage = {
  pageNumber: number;
  photoPaths: unknown;
};

function slotBox(slot: AlbumSlot, pageSize: number) {
  return {
    left: Math.round((slot.left / 100) * pageSize),
    top: Math.round((slot.top / 100) * pageSize),
    width: Math.max(1, Math.round((slot.width / 100) * pageSize)),
    height: Math.max(1, Math.round((slot.height / 100) * pageSize)),
  };
}

function innerBox(box: { left: number; top: number; width: number; height: number }) {
  const pad = Math.max(8, Math.round(Math.min(box.width, box.height) * 0.028));
  return {
    left: box.left + pad,
    top: box.top + pad,
    width: Math.max(1, box.width - pad * 2),
    height: Math.max(1, box.height - pad * 2),
    pad,
  };
}

function coverExtract(options: {
  boxWidth: number;
  boxHeight: number;
  imageWidth: number;
  imageHeight: number;
  x: number;
  y: number;
}) {
  const scale = Math.max(
    options.boxWidth / options.imageWidth,
    options.boxHeight / options.imageHeight,
  );
  let scaledW = Math.max(1, Math.round(options.imageWidth * scale));
  let scaledH = Math.max(1, Math.round(options.imageHeight * scale));
  if (scaledW < options.boxWidth || scaledH < options.boxHeight) {
    const bump = Math.max(
      options.boxWidth / scaledW,
      options.boxHeight / scaledH,
    );
    scaledW = Math.ceil(scaledW * bump);
    scaledH = Math.ceil(scaledH * bump);
  }
  const overflowX = Math.max(0, scaledW - options.boxWidth);
  const overflowY = Math.max(0, scaledH - options.boxHeight);
  const left = Math.min(
    overflowX,
    Math.max(0, Math.round(overflowX * (clampAlbumFocus(options.x) / 100))),
  );
  const top = Math.min(
    overflowY,
    Math.max(0, Math.round(overflowY * (clampAlbumFocus(options.y) / 100))),
  );
  return {
    scaledW,
    scaledH,
    left,
    top,
    width: options.boxWidth,
    height: options.boxHeight,
  };
}

async function solidPng(
  width: number,
  height: number,
  background: { r: number; g: number; b: number },
) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background,
    },
  })
    .png()
    .toBuffer();
}

async function cropPhotoToSlot(
  photo: AlbumSlotPhoto,
  boxWidth: number,
  boxHeight: number,
) {
  const bytes = await readStoredAsset(photo.path);
  if (!bytes) {
    return null;
  }
  const meta = await sharp(bytes).rotate().metadata();
  const imageWidth = meta.width ?? 0;
  const imageHeight = meta.height ?? 0;
  if (!imageWidth || !imageHeight) {
    return null;
  }
  const extract = coverExtract({
    boxWidth,
    boxHeight,
    imageWidth,
    imageHeight,
    x: photo.x,
    y: photo.y,
  });
  return sharp(bytes)
    .rotate()
    .resize(extract.scaledW, extract.scaledH)
    .extract({
      left: extract.left,
      top: extract.top,
      width: extract.width,
      height: extract.height,
    })
    .jpeg({ quality: 92 })
    .toBuffer();
}

function pageNumberSvg(pageSize: number, pageNumber: number) {
  const y = Math.round(pageSize * 0.975);
  return Buffer.from(
    `<svg width="${pageSize}" height="${pageSize}" xmlns="http://www.w3.org/2000/svg">
      <text x="${pageSize / 2}" y="${y}" text-anchor="middle" font-size="${Math.round(pageSize * 0.018)}" font-family="Arial, sans-serif" fill="#a8a29e">${pageNumber}</text>
    </svg>`,
  );
}

export async function renderAlbumLeafPage(
  page: AlbumPrintPage,
  pageSize = ALBUM_PRINT_PAGE_SIZE,
): Promise<Buffer> {
  const photos = leafPhotosFromStored(page.photoPaths, "self");
  const layers: Array<{ input: Buffer; left: number; top: number }> = [];

  for (const slot of PHOTO_ALBUM_LAYOUT.slots) {
    const outer = slotBox(slot, pageSize);
    const inner = innerBox(outer);
    const ring = 2;
    layers.push({
      input: await solidPng(
        outer.width + ring * 2,
        outer.height + ring * 2,
        RING,
      ),
      left: Math.max(0, outer.left - ring),
      top: Math.max(0, outer.top - ring),
    });
    layers.push({
      input: await solidPng(outer.width, outer.height, MAT_WHITE),
      left: outer.left,
      top: outer.top,
    });

    const photo = photos[slot.id];
    const cropped = photo
      ? await cropPhotoToSlot(photo, inner.width, inner.height)
      : null;
    layers.push({
      input: cropped ?? (await solidPng(inner.width, inner.height, EMPTY_INNER)),
      left: inner.left,
      top: inner.top,
    });
  }

  layers.push({
    input: pageNumberSvg(pageSize, page.pageNumber),
    left: 0,
    top: 0,
  });

  return sharp({
    create: {
      width: pageSize,
      height: pageSize,
      channels: 3,
      background: PAGE_BG,
    },
  })
    .composite(layers)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

export async function renderAlbumSpread(options: {
  leftPage?: AlbumPrintPage;
  rightPage?: AlbumPrintPage;
  pageSize?: number;
}): Promise<Buffer> {
  const pageSize = options.pageSize ?? ALBUM_PRINT_PAGE_SIZE;
  const width = pageSize * 2;
  const layers: Array<{ input: Buffer; left: number; top: number }> = [];
  if (options.leftPage) {
    layers.push({
      input: await renderAlbumLeafPage(options.leftPage, pageSize),
      left: 0,
      top: 0,
    });
  }
  if (options.rightPage) {
    layers.push({
      input: await renderAlbumLeafPage(options.rightPage, pageSize),
      left: pageSize,
      top: 0,
    });
  }
  return sharp({
    create: {
      width,
      height: pageSize,
      channels: 3,
      background: PAGE_BG,
    },
  })
    .composite(layers)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

export async function buildAlbumPrintZipEntries(
  pages: AlbumPrintPage[],
): Promise<Array<{ name: string; content: Buffer }>> {
  const entries: Array<{ name: string; content: Buffer }> = [];
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const leafByNumber = new Map<number, Buffer>();

  for (const page of sorted) {
    const pageNo = String(page.pageNumber).padStart(2, "0");
    const leaf = await renderAlbumLeafPage(page);
    leafByNumber.set(page.pageNumber, leaf);
    entries.push({
      name: `페이지/${pageNo}페이지.jpg`,
      content: leaf,
    });
  }

  const spreads = pairAlbumPagesIntoSpreads(sorted);
  for (const spread of spreads) {
    const spreadNo = String(spread.spreadIndex + 1).padStart(2, "0");
    const pageSize = ALBUM_PRINT_PAGE_SIZE;
    const layers: Array<{ input: Buffer; left: number; top: number }> = [];
    const left = spread.leftPage
      ? leafByNumber.get(spread.leftPage.pageNumber)
      : undefined;
    const right = spread.rightPage
      ? leafByNumber.get(spread.rightPage.pageNumber)
      : undefined;
    if (left) {
      layers.push({ input: left, left: 0, top: 0 });
    }
    if (right) {
      layers.push({ input: right, left: pageSize, top: 0 });
    }
    entries.push({
      name: `펼침/${spreadNo}펼침.jpg`,
      content: await sharp({
        create: {
          width: pageSize * 2,
          height: pageSize,
          channels: 3,
          background: PAGE_BG,
        },
      })
        .composite(layers)
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer(),
    });
  }

  return entries;
}
