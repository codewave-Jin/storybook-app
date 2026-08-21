import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { del, put } from "@vercel/blob";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const CHARACTERS_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "characters",
);
const ILLUSTRATIONS_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "illustrations",
);

function extensionFromMime(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

function blobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isRemoteAsset(value: string | null | undefined): value is string {
  return Boolean(value && /^https?:\/\//i.test(value));
}

async function saveBuffer(
  buffer: Buffer,
  folder: "characters" | "illustrations",
  extension: string,
  contentType?: string,
) {
  const filename = `${crypto.randomUUID()}${extension.startsWith(".") ? extension : `.${extension}`}`;

  if (blobStorageEnabled()) {
    const blob = await put(`uploads/${folder}/${filename}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: contentType ?? "image/png",
    });
    return blob.url;
  }

  const destDir =
    folder === "characters" ? CHARACTERS_UPLOAD_DIR : ILLUSTRATIONS_UPLOAD_DIR;
  await mkdir(destDir, { recursive: true });
  await writeFile(path.join(destDir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

export async function saveCharacterPhoto(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("이미지 크기는 5MB 이하여야 합니다.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return saveBuffer(
    buffer,
    "characters",
    extensionFromMime(file.type),
    file.type,
  );
}

export function toAbsolutePublicPath(publicPath: string) {
  if (isRemoteAsset(publicPath)) {
    return publicPath;
  }

  return path.join(
    process.cwd(),
    "public",
    ...publicPath.split("/").filter(Boolean),
  );
}

async function downloadRemoteAsset(url: string) {
  const response = await fetch(url, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  if (!response.ok) {
    throw new Error(`Generated image download failed: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function persistGeneratedCharacterImage(sourcePath: string) {
  return persistGeneratedImage(sourcePath, "characters");
}

export async function persistGeneratedIllustrationImage(sourcePath: string) {
  return persistGeneratedImage(sourcePath, "illustrations");
}

async function persistGeneratedImage(
  sourcePath: string,
  publicFolder: "characters" | "illustrations",
) {
  if (sourcePath.startsWith("/uploads/") || sourcePath.startsWith("/dummy/")) {
    return sourcePath;
  }

  if (isRemoteAsset(sourcePath)) {
    if (sourcePath.includes("blob.vercel-storage.com")) {
      return sourcePath;
    }

    const buffer = await downloadRemoteAsset(sourcePath);
    const ext = path.extname(new URL(sourcePath).pathname) || ".png";
    return saveBuffer(buffer, publicFolder, ext);
  }

  const candidates = [
    sourcePath,
    path.isAbsolute(sourcePath) ? sourcePath : path.resolve(sourcePath),
    path.resolve(process.cwd(), sourcePath),
    path.resolve(process.cwd(), "..", "workflow", "api", sourcePath),
  ];
  const absolute = candidates.find((candidate) => existsSync(candidate));

  if (!absolute) {
    throw new Error(
      `Generated image not found. tried=${JSON.stringify(candidates)}`,
    );
  }

  const buffer = await readFile(absolute);
  const ext = path.extname(absolute) || ".png";
  return saveBuffer(buffer, publicFolder, ext);
}

export async function readStoredAsset(storedPath: string | null | undefined) {
  if (!storedPath) {
    return null;
  }

  if (isRemoteAsset(storedPath)) {
    try {
      return await downloadRemoteAsset(storedPath);
    } catch {
      return null;
    }
  }

  if (!storedPath.startsWith("/") || storedPath.includes("..")) {
    return null;
  }

  const filepath = path.join(
    process.cwd(),
    "public",
    ...storedPath.split("/").filter(Boolean),
  );

  if (!existsSync(filepath)) {
    return null;
  }

  return readFile(filepath);
}

export async function deletePublicFile(publicPath: string | null | undefined) {
  if (!publicPath) {
    return;
  }

  if (isRemoteAsset(publicPath)) {
    try {
      await del(publicPath);
    } catch {
      // Blob may already be gone.
    }
    return;
  }

  if (!publicPath.startsWith("/uploads/")) {
    return;
  }

  const filepath = path.join(
    process.cwd(),
    "public",
    ...publicPath.split("/").filter(Boolean),
  );
  try {
    await unlink(filepath);
  } catch {
    // File may already be gone.
  }
}

export async function deleteIllustrationFile(
  publicPath: string | null | undefined,
) {
  if (isRemoteAsset(publicPath)) {
    await deletePublicFile(publicPath);
    return;
  }

  if (!publicPath?.startsWith("/uploads/illustrations/")) {
    return;
  }

  await deletePublicFile(publicPath);
}
