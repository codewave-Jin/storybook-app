import { access } from "fs/promises";
import path from "path";

export function publicUrlToFsPath(publicPath: string | null | undefined) {
  if (!publicPath || !publicPath.startsWith("/") || publicPath.includes("..")) {
    return null;
  }

  return path.join(
    process.cwd(),
    "public",
    ...publicPath.split("/").filter(Boolean),
  );
}

export async function fileExists(filepath: string) {
  try {
    await access(filepath);
    return true;
  } catch {
    return false;
  }
}

export function contentDisposition(filename: string) {
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"; filename*=UTF-8''${encoded}`;
}
