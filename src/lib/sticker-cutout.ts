import sharp from "sharp";
import { isComfyMockEnabled, postToComfy } from "@/lib/comfy-server";

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function colorDistance(
  red: number,
  green: number,
  blue: number,
  otherRed: number,
  otherGreen: number,
  otherBlue: number,
) {
  return (
    Math.abs(red - otherRed) +
    Math.abs(green - otherGreen) +
    Math.abs(blue - otherBlue)
  );
}

function isStudioBackdrop(
  red: number,
  green: number,
  blue: number,
  background: readonly [number, number, number],
) {
  if (colorDistance(red, green, blue, background[0], background[1], background[2]) <= 150) {
    return true;
  }

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const chroma = max - min;
  const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
  return (
    (luminance >= 232 && chroma <= 40) ||
    (luminance >= 220 && chroma <= 22)
  );
}

export async function imageHasTransparency(imageBytes: Buffer) {
  const { data, info } = await sharp(imageBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 3; index < data.length; index += info.channels) {
    if ((data[index] ?? 255) < 250) {
      return true;
    }
  }
  return false;
}

export async function removeNearWhiteBackground(imageBytes: Buffer) {
  const { data, info } = await sharp(imageBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  const pixel = (x: number, y: number) => (y * width + x) * channels;
  const sample = (x: number, y: number) => {
    const index = pixel(x, y);
    return [data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0] as const;
  };

  const corners = [
    sample(0, 0),
    sample(width - 1, 0),
    sample(0, height - 1),
    sample(width - 1, height - 1),
    sample(Math.floor(width / 2), 0),
    sample(Math.floor(width / 2), height - 1),
    sample(0, Math.floor(height / 2)),
    sample(width - 1, Math.floor(height / 2)),
  ];
  const background: [number, number, number] = [
    Math.round(corners.reduce((sum, item) => sum + item[0], 0) / corners.length),
    Math.round(corners.reduce((sum, item) => sum + item[1], 0) / corners.length),
    Math.round(corners.reduce((sum, item) => sum + item[2], 0) / corners.length),
  ];

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const key = y * width + x;
    if (visited[key]) {
      return;
    }
    const index = pixel(x, y);
    if (
      !isStudioBackdrop(
        data[index] ?? 0,
        data[index + 1] ?? 0,
        data[index + 2] ?? 0,
        background,
      )
    ) {
      return;
    }
    visited[key] = 1;
    queue.push(key);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (queue.length > 0) {
    const key = queue.pop();
    if (key === undefined) {
      break;
    }
    const x = key % width;
    const y = Math.floor(key / width);
    const index = pixel(x, y);
    data[index + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  return sharp(data, {
    raw: {
      width,
      height,
      channels,
    },
  })
    .png()
    .toBuffer();
}

export async function clearStickerCharacterBackground(
  imagePath: string,
  imageBytes: Buffer,
): Promise<Buffer> {
  if (!isComfyMockEnabled()) {
    try {
      const response = await postToComfy(
        "/clear-background",
        {
          image_path: imagePath,
          image_base64: imageBytes.toString("base64"),
        },
        { timeoutMs: 180000 },
      );
      if (!response.ok) {
        throw new Error(`clear-background rejected (${response.status})`);
      }
      const payload = (await response.json()) as {
        image_base64?: unknown;
      };
      const encoded = asNonEmptyString(payload.image_base64);
      if (!encoded) {
        throw new Error("clear-background returned no image");
      }
      const cutout = Buffer.from(encoded, "base64");
      if (await imageHasTransparency(cutout)) {
        return cutout;
      }
      console.warn(
        "[sticker-cutout] Comfy rembg returned an opaque image, falling back to flood-fill",
      );
    } catch (error) {
      console.warn(
        "[sticker-cutout] Comfy rembg failed, falling back to flood-fill",
        error,
      );
    }
  }

  return removeNearWhiteBackground(imageBytes);
}
