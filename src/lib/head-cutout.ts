const WASM_BASE = "/mediapipe";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite";

const HAIR = 1;
const BODY_SKIN = 2;
const FACE_SKIN = 3;
const OTHER = 5;

const OUTPUT_MAX = 1024;

type Segmenter = {
  segment: (image: CanvasImageSource) => {
    categoryMask?: {
      width: number;
      height: number;
      getAsUint8Array: () => Uint8Array;
      close: () => void;
    } | null;
    close: () => void;
  };
  close: () => void;
};

let segmenterPromise: Promise<Segmenter> | null = null;

function loadImageElement(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("사진을 불러오지 못했습니다."));
    };
    image.src = url;
  });
}

async function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const wasm = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      const options = {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU" as const,
        },
        runningMode: "IMAGE" as const,
        outputCategoryMask: true,
      };
      try {
        return (await vision.ImageSegmenter.createFromOptions(
          wasm,
          options,
        )) as Segmenter;
      } catch {
        return (await vision.ImageSegmenter.createFromOptions(wasm, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: "CPU" },
        })) as Segmenter;
      }
    })().catch((error: unknown) => {
      segmenterPromise = null;
      throw error instanceof Error
        ? error
        : new Error("얼굴 분리 모델을 불러오지 못했습니다.");
    });
  }
  return segmenterPromise;
}

function keepMask(
  categories: Uint8Array,
  width: number,
  height: number,
) {
  let faceCount = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hairMinX = width;
  let hairMaxX = 0;
  const rowWidths = new Int32Array(height);

  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    const x = index % width;
    const y = Math.floor(index / width);
    if (category === FACE_SKIN) {
      faceCount += 1;
      rowWidths[y] += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    } else if (category === HAIR) {
      hairMinX = Math.min(hairMinX, x);
      hairMaxX = Math.max(hairMaxX, x);
    }
  }

  if (faceCount < Math.max(8, Math.round(width * height * 0.004))) {
    return null;
  }

  const faceHeight = Math.max(1, maxY - minY);
  let cheekWidth = 0;
  let cheekY = minY;
  for (let y = minY; y <= maxY; y += 1) {
    const rowWidth = rowWidths[y] ?? 0;
    if (rowWidth > cheekWidth) {
      cheekWidth = rowWidth;
      cheekY = y;
    }
  }
  const neckWidth = Math.max(3, Math.round(cheekWidth * 0.34));
  const chinCap = Math.min(maxY, cheekY + Math.round(faceHeight * 0.58));
  let chinY = cheekY;
  for (let y = cheekY; y <= chinCap; y += 1) {
    if ((rowWidths[y] ?? 0) < neckWidth) {
      break;
    }
    chinY = y;
  }

  const sideMin = Math.min(minX, hairMinX);
  const sideMax = Math.max(maxX, hairMaxX);
  const sidePad = Math.round((maxX - minX) * 0.25);
  const keepLeft = Math.max(0, sideMin - sidePad);
  const keepRight = Math.min(width - 1, sideMax + sidePad);
  const faceSpan = Math.max(1, maxX - minX);
  const chinLeft = minX + Math.round(faceSpan * 0.18);
  const chinRight = maxX - Math.round(faceSpan * 0.18);
  const chinSearchBottom = Math.min(height - 1, chinY + Math.round(faceHeight * 0.16));
  const chinKeepWidth = Math.max(4, Math.round(faceSpan * 0.26));
  let chinBottom = chinY;
  for (let y = chinY + 1; y <= chinSearchBottom; y += 1) {
    let rowWidth = 0;
    const row = y * width;
    for (let x = chinLeft; x <= chinRight; x += 1) {
      const category = categories[row + x];
      if (category === FACE_SKIN || category === BODY_SKIN || category === OTHER) {
        rowWidth += 1;
      }
    }
    if (rowWidth < chinKeepWidth) {
      break;
    }
    chinBottom = y;
  }
  const mask = new Uint8Array(categories.length);

  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    const x = index % width;
    const y = Math.floor(index / width);
    const inFace = x >= keepLeft && x <= keepRight && y <= chinY;
    const inChin =
      y > chinY &&
      y <= chinBottom &&
      x >= chinLeft &&
      x <= chinRight &&
      (category === FACE_SKIN || category === BODY_SKIN || category === OTHER);
    if (
      category === HAIR ||
      (category === FACE_SKIN && y <= chinY) ||
      ((category === BODY_SKIN || category === OTHER) && inFace) ||
      inChin
    ) {
      mask[index] = 255;
    }
  }

  return mask;
}

function sampleMask(
  mask: Uint8Array,
  maskWidth: number,
  maskHeight: number,
  width: number,
  height: number,
) {
  const alpha = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    const maskY = Math.min(
      maskHeight - 1,
      Math.floor(((y + 0.5) * maskHeight) / height),
    );
    for (let x = 0; x < width; x += 1) {
      const maskX = Math.min(
        maskWidth - 1,
        Math.floor(((x + 0.5) * maskWidth) / width),
      );
      alpha[y * width + x] = mask[maskY * maskWidth + maskX] ?? 0;
    }
  }
  return alpha;
}

function dilate(alpha: Uint8ClampedArray, width: number, height: number, radius: number) {
  const source = alpha.slice();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let max = 0;
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(height - 1, y + radius);
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      for (let yy = y0; yy <= y1; yy += 1) {
        for (let xx = x0; xx <= x1; xx += 1) {
          max = Math.max(max, source[yy * width + xx] ?? 0);
        }
      }
      alpha[y * width + x] = max;
    }
  }
}

function blurAlpha(alpha: Uint8ClampedArray, width: number, height: number, radius: number) {
  const horizontal = new Uint8ClampedArray(alpha.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const xx = x + offset;
        if (xx < 0 || xx >= width) {
          continue;
        }
        sum += alpha[y * width + xx] ?? 0;
        count += 1;
      }
      horizontal[y * width + x] = Math.round(sum / count);
    }
  }
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      let count = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const yy = y + offset;
        if (yy < 0 || yy >= height) {
          continue;
        }
        sum += horizontal[yy * width + x] ?? 0;
        count += 1;
      }
      alpha[y * width + x] = Math.round(sum / count);
    }
  }
}

type HeadCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
  outWidth: number;
  outHeight: number;
};

function measureHeadCrop(source: HTMLCanvasElement): HeadCrop {
  const ctx = source.getContext("2d");
  if (!ctx) {
    throw new Error("얼굴을 분리하지 못했습니다.");
  }
  const { width, height } = source;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((pixels[(y * width + x) * 4 + 3] ?? 0) < 12) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX <= minX || maxY <= minY) {
    throw new Error("얼굴만 남기지 못했습니다. 원에 얼굴이 가득 차게 다시 맞춰 주세요.");
  }

  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.06);
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(width - cropX, maxX - minX + 1 + pad * 2);
  const cropH = Math.min(height - cropY, maxY - minY + 1 + pad * 2);
  const scale = Math.min(1, OUTPUT_MAX / Math.max(cropW, cropH));
  return {
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH,
    outWidth: Math.max(1, Math.round(cropW * scale)),
    outHeight: Math.max(1, Math.round(cropH * scale)),
  };
}

function paintCrop(source: CanvasImageSource, crop: HeadCrop) {
  const out = document.createElement("canvas");
  out.width = crop.outWidth;
  out.height = crop.outHeight;
  const outCtx = out.getContext("2d");
  if (!outCtx) {
    throw new Error("얼굴을 분리하지 못했습니다.");
  }
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.outWidth, crop.outHeight);
  return out;
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("얼굴을 저장하지 못했습니다."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

async function segmentFaceAlpha(image: CanvasImageSource, width: number, height: number) {
  const segmenter = await getSegmenter();
  const result = segmenter.segment(image);
  const categoryMask = result.categoryMask;
  if (!categoryMask) {
    result.close();
    throw new Error("얼굴을 찾지 못했습니다. 원에 얼굴이 가득 차게 다시 맞춰 주세요.");
  }

  const maskWidth = categoryMask.width;
  const maskHeight = categoryMask.height;
  const categories = new Uint8Array(categoryMask.getAsUint8Array());
  const mask = keepMask(categories, maskWidth, maskHeight);
  try {
    categoryMask.close();
    result.close();
  } catch {
    // The segmenter releases the mask with the result.
  }
  if (!mask) {
    throw new Error("얼굴을 찾지 못했습니다. 원에 얼굴이 가득 차게 다시 맞춰 주세요.");
  }

  const alpha = sampleMask(mask, maskWidth, maskHeight, width, height);
  const edge = Math.max(1, Math.round(Math.min(width, height) / 180));
  dilate(alpha, width, height, edge);
  blurAlpha(alpha, width, height, edge);
  return alpha;
}

export async function faceKeepAlpha(blob: Blob) {
  const image = await loadImageElement(blob);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  return {
    alpha: await segmentFaceAlpha(image, width, height),
    width,
    height,
  };
}

function drawLimited(image: HTMLImageElement) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, OUTPUT_MAX / Math.max(sourceWidth, sourceHeight));
  if (scale === 1) {
    return image;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return image;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export type HeadCutout = {
  cutout: Blob;
  source: Blob;
};

export async function cutoutHeadPng(blob: Blob): Promise<HeadCutout> {
  const image = drawLimited(await loadImageElement(blob));
  const width = "naturalWidth" in image ? image.naturalWidth || image.width : image.width;
  const height = "naturalHeight" in image ? image.naturalHeight || image.height : image.height;
  const alpha = await segmentFaceAlpha(image, width, height);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("얼굴을 분리하지 못했습니다.");
  }
  ctx.drawImage(image, 0, 0, width, height);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext("2d");
  if (!sourceCtx) {
    throw new Error("얼굴을 분리하지 못했습니다.");
  }
  sourceCtx.drawImage(canvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  for (let index = 0; index < alpha.length; index += 1) {
    imageData.data[index * 4 + 3] = alpha[index] ?? 0;
  }
  ctx.putImageData(imageData, 0, 0);

  const crop = measureHeadCrop(canvas);
  const [cutout, source] = await Promise.all([
    canvasToPng(paintCrop(canvas, crop)),
    canvasToPng(paintCrop(sourceCanvas, crop)),
  ]);
  return { cutout, source };
}
