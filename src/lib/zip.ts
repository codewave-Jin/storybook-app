import { ZipArchive } from "archiver";
import { readStoredAsset } from "@/lib/uploads";

export async function zipFiles(
  entries: Array<{ storedPath?: string; content?: Buffer | string; name: string }>,
) {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  archive.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
  });

  const finished = new Promise<void>((resolve, reject) => {
    archive.on("end", () => resolve());
    archive.on("error", reject);
  });

  for (const entry of entries) {
    if (entry.content != null) {
      archive.append(
        typeof entry.content === "string"
          ? Buffer.from(entry.content, "utf8")
          : entry.content,
        { name: entry.name },
      );
      continue;
    }

    if (!entry.storedPath) {
      continue;
    }

    const file = await readStoredAsset(entry.storedPath);
    if (file) {
      archive.append(file, { name: entry.name });
    }
  }

  await archive.finalize();
  await finished;
  return Buffer.concat(chunks);
}
