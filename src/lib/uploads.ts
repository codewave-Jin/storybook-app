import { copyFile, mkdir, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

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

export async function saveCharacterPhoto(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("이미지 크기는 5MB 이하여야 합니다.");
  }

  await mkdir(CHARACTERS_UPLOAD_DIR, { recursive: true });

  const filename = `${crypto.randomUUID()}.${extensionFromMime(file.type)}`;
  const filepath = path.join(CHARACTERS_UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return `/uploads/characters/${filename}`;
}

export function toAbsolutePublicPath(publicPath: string) {
  return path.join(
    process.cwd(),
    "public",
    ...publicPath.split("/").filter(Boolean),
  );
}

export async function persistGeneratedCharacterImage(sourcePath: string) {
  return persistGeneratedImage(sourcePath, CHARACTERS_UPLOAD_DIR, "characters");
}

export async function persistGeneratedIllustrationImage(sourcePath: string) {
  const resolved =
    sourcePath.startsWith("/uploads/") || sourcePath.startsWith("/dummy/")
      ? toAbsolutePublicPath(sourcePath)
      : sourcePath;

  return persistGeneratedImage(
    resolved,
    ILLUSTRATIONS_UPLOAD_DIR,
    "illustrations",
  );
}

async function persistGeneratedImage(
  sourcePath: string,
  destDir: string,
  publicFolder: "characters" | "illustrations",
) {
  if (sourcePath.startsWith("/uploads/") || sourcePath.startsWith("/dummy/")) {
    return sourcePath;
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

  await mkdir(destDir, { recursive: true });
  const ext = path.extname(absolute) || ".png";
  const filename = `${crypto.randomUUID()}${ext}`;
  const dest = path.join(destDir, filename);
  await copyFile(absolute, dest);
  return `/uploads/${publicFolder}/${filename}`;
}

export async function deletePublicFile(publicPath: string | null | undefined) {
  if (!publicPath || !publicPath.startsWith("/uploads/")) {
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
  if (!publicPath?.startsWith("/uploads/illustrations/")) {
    return;
  }

  await deletePublicFile(publicPath);
}
