import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { del, put } from "@vercel/blob";
import { deleteWatermarkCache } from "@/lib/preview-watermark";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

type UploadFolder = "characters" | "illustrations" | "stickers" | "albums";

function extensionFromMime(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

function blobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function shouldUseBlobStorage() {
  return blobStorageEnabled() && process.env.VERCEL === "1";
}

function requireBlobStorage() {
  if (blobStorageEnabled()) {
    return;
  }
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required to store generated images",
    );
  }
}

function looksLikeImage(buffer: Buffer) {
  return (
    buffer.length >= 24 &&
    ((buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e) ||
      (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
      buffer.subarray(0, 4).toString("ascii") === "RIFF")
  );
}

export function isRemoteAsset(value: string | null | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export function sniffImageContentType(bytes: Buffer) {
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF") {
    return "image/webp";
  }
  if (bytes.length >= 3 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  return "image/png";
}

export function guessStoredAssetMime(storedPath: string) {
  const pathname = (() => {
    try {
      return isRemoteAsset(storedPath) ? new URL(storedPath).pathname : storedPath;
    } catch {
      return storedPath;
    }
  })();
  const ext = path.extname(pathname).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

export function resolveStoredAbsolutePath(storedPath: string) {
  if (isRemoteAsset(storedPath) || storedPath.includes("..") || !storedPath.startsWith("/")) {
    return null;
  }

  const segments = storedPath.split("/").filter(Boolean);
  const publicPath = path.join(process.cwd(), "public", ...segments);
  const privatePath = storedPath.startsWith("/uploads/")
    ? path.join(process.cwd(), "storage", ...segments)
    : null;

  if (privatePath && existsSync(privatePath)) {
    return privatePath;
  }
  if (existsSync(publicPath)) {
    return publicPath;
  }
  return privatePath ?? publicPath;
}

function privateUploadDir(folder: UploadFolder, ownerUserId?: string) {
  return ownerUserId
    ? path.join(process.cwd(), "storage", "uploads", folder, ownerUserId)
    : path.join(process.cwd(), "storage", "uploads", folder);
}

async function saveBuffer(
  buffer: Buffer,
  folder: UploadFolder,
  extension: string,
  contentType?: string,
  ownerUserId?: string,
) {
  const filename = `${crypto.randomUUID()}${extension.startsWith(".") ? extension : `.${extension}`}`;
  const publicPath = ownerUserId
    ? `/uploads/${folder}/${ownerUserId}/${filename}`
    : `/uploads/${folder}/${filename}`;

  if (shouldUseBlobStorage()) {
    const blob = await put(`uploads/${folder}/${ownerUserId ?? "shared"}/${filename}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: contentType ?? "image/png",
    });
    return blob.url;
  }

  const destDir = privateUploadDir(folder, ownerUserId);
  await mkdir(destDir, { recursive: true });
  await writeFile(path.join(destDir, filename), buffer);
  return publicPath;
}

export async function saveCharacterPhoto(file: File, ownerUserId?: string): Promise<string> {
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
    ownerUserId,
  );
}

const ADMIN_ILLUSTRATION_MAX_BYTES = 20 * 1024 * 1024;

export async function saveAdminCharacterFile(file: File, ownerUserId?: string): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("JPG, PNG, WEBP 이미지만 올릴 수 있습니다.");
  }

  if (file.size > ADMIN_ILLUSTRATION_MAX_BYTES) {
    throw new Error("이미지 크기는 20MB 이하여야 합니다.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(buffer)) {
    throw new Error("이미지 파일이 아닙니다.");
  }

  return saveBuffer(
    buffer,
    "characters",
    extensionFromMime(file.type),
    file.type,
    ownerUserId,
  );
}

export async function saveAdminIllustrationFile(file: File, ownerUserId?: string): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("JPG, PNG, WEBP 이미지만 올릴 수 있습니다.");
  }

  if (file.size > ADMIN_ILLUSTRATION_MAX_BYTES) {
    throw new Error("이미지 크기는 20MB 이하여야 합니다.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(buffer)) {
    throw new Error("이미지 파일이 아닙니다.");
  }

  return saveBuffer(
    buffer,
    "illustrations",
    extensionFromMime(file.type),
    file.type,
    ownerUserId,
  );
}

export async function saveAlbumPhoto(file: File, ownerUserId?: string): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("이미지 크기는 5MB 이하여야 합니다.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return saveBuffer(buffer, "albums", extensionFromMime(file.type), file.type, ownerUserId);
}

export function toAbsolutePublicPath(publicPath: string) {
  if (isRemoteAsset(publicPath)) {
    return publicPath;
  }

  return resolveStoredAbsolutePath(publicPath) ?? path.join(
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

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/") && !looksLikeImage(buffer)) {
    throw new Error("Generated image download did not return an image");
  }

  return buffer;
}

export async function persistGeneratedCharacterImage(
  sourcePath: string,
  ownerUserId?: string,
) {
  return persistGeneratedImage(sourcePath, "characters", ownerUserId);
}

export async function persistGeneratedIllustrationImage(
  sourcePath: string,
  ownerUserId?: string,
) {
  return persistGeneratedImage(sourcePath, "illustrations", ownerUserId);
}

export async function persistGeneratedIllustrationBuffer(
  buffer: Buffer,
  contentType = "image/jpeg",
  ownerUserId?: string,
) {
  return saveBuffer(
    buffer,
    "illustrations",
    extensionFromMime(contentType),
    contentType,
    ownerUserId,
  );
}

export async function persistGeneratedStickerBuffer(
  buffer: Buffer,
  contentType = "image/jpeg",
  ownerUserId?: string,
) {
  return saveBuffer(
    buffer,
    "stickers",
    extensionFromMime(contentType),
    contentType,
    ownerUserId,
  );
}

async function persistGeneratedImage(
  sourcePath: string,
  publicFolder: "characters" | "illustrations",
  ownerUserId?: string,
) {
  if (sourcePath.startsWith("/dummy/")) {
    return sourcePath;
  }

  if (isRemoteAsset(sourcePath) && sourcePath.includes("blob.vercel-storage.com")) {
    if (shouldUseBlobStorage()) {
      return sourcePath;
    }
  }

  if (shouldUseBlobStorage()) {
    requireBlobStorage();
  }

  if (sourcePath.startsWith("/uploads/")) {
    const absolute = toAbsolutePublicPath(sourcePath);
    if (!existsSync(absolute)) {
      throw new Error(`Generated image not found: ${sourcePath}`);
    }
    const buffer = await readFile(absolute);
    const ext = path.extname(absolute) || ".png";
    return saveBuffer(buffer, publicFolder, ext, undefined, ownerUserId);
  }

  if (isRemoteAsset(sourcePath)) {
    const buffer = await downloadRemoteAsset(sourcePath);
    const ext = path.extname(new URL(sourcePath).pathname) || ".png";
    return saveBuffer(buffer, publicFolder, ext, undefined, ownerUserId);
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
  return saveBuffer(buffer, publicFolder, ext, undefined, ownerUserId);
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

  const filepath = resolveStoredAbsolutePath(storedPath);
  if (!filepath || !existsSync(filepath)) {
    return null;
  }

  return readFile(filepath);
}

export async function deletePublicFile(publicPath: string | null | undefined) {
  if (!publicPath) {
    return;
  }

  await deleteWatermarkCache(publicPath);

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

  const segments = publicPath.split("/").filter(Boolean);
  const candidates = [
    path.join(process.cwd(), "storage", ...segments),
    path.join(process.cwd(), "public", ...segments),
  ];
  for (const filepath of candidates) {
    try {
      await unlink(filepath);
    } catch {
      // File may already be gone.
    }
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

export async function deleteStickerFile(
  publicPath: string | null | undefined,
) {
  if (isRemoteAsset(publicPath)) {
    await deletePublicFile(publicPath);
    return;
  }

  if (!publicPath?.startsWith("/uploads/stickers/")) {
    return;
  }

  await deletePublicFile(publicPath);
}
