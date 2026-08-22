export type CropPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const OUTPUT_SIZE = 1024;
const JPEG_QUALITY = 0.9;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("이미지를 불러오지 못했습니다.")),
    );
    image.src = src;
  });
}

function drawSquareCrop(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("이미지를 저장하지 못했습니다.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return canvas;
}

export function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  filename = "character-face.jpg",
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("이미지를 저장하지 못했습니다."));
          return;
        }
        resolve(new File([blob], filename, { type: "image/jpeg" }));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

function clampCrop(
  x: number,
  y: number,
  size: number,
  sourceWidth: number,
  sourceHeight: number,
) {
  const maxSize = Math.max(1, Math.min(sourceWidth, sourceHeight));
  const safeSize = Math.max(1, Math.min(size, maxSize));
  const safeX = Math.max(0, Math.min(x, sourceWidth - safeSize));
  const safeY = Math.max(0, Math.min(y, sourceHeight - safeSize));
  return { x: safeX, y: safeY, size: safeSize };
}

export async function getCroppedImageFile(
  imageSrc: string,
  crop: CropPixels,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const size = Math.min(Math.max(1, crop.width), Math.max(1, crop.height));
  const region = clampCrop(crop.x, crop.y, size, image.width, image.height);
  const canvas = drawSquareCrop(
    image,
    region.x,
    region.y,
    region.size,
    region.size,
  );
  return canvasToJpegFile(canvas);
}

function sourceSize(source: HTMLCanvasElement | HTMLVideoElement) {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  return { width: source.width, height: source.height };
}

export function cropCanvasToSquareFile(
  source: HTMLCanvasElement | HTMLVideoElement,
  sx: number,
  sy: number,
  size: number,
): Promise<File> {
  const { width, height } = sourceSize(source);
  const region = clampCrop(sx, sy, size, width, height);
  const canvas = drawSquareCrop(
    source,
    region.x,
    region.y,
    region.size,
    region.size,
  );
  return canvasToJpegFile(canvas);
}

/**
 * Maps a centered circular guide (as a fraction of the shorter visible side)
 * from an object-fit:cover video onto source video pixels.
 */
export function getCoverGuideCrop(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
  guideRatio: number,
): { x: number; y: number; size: number } {
  const videoRatio = videoWidth / Math.max(1, videoHeight);
  const containerRatio = containerWidth / Math.max(1, containerHeight);

  let visibleW: number;
  let visibleH: number;
  let originX: number;
  let originY: number;

  if (videoRatio > containerRatio) {
    visibleH = videoHeight;
    visibleW = videoHeight * containerRatio;
    originX = (videoWidth - visibleW) / 2;
    originY = 0;
  } else {
    visibleW = videoWidth;
    visibleH = videoWidth / containerRatio;
    originX = 0;
    originY = (videoHeight - visibleH) / 2;
  }

  const size = Math.min(visibleW, visibleH) * guideRatio;
  return {
    x: originX + (visibleW - size) / 2,
    y: originY + (visibleH - size) / 2,
    size,
  };
}
