import { ZipArchive } from "archiver";
import { readStoredAsset } from "@/lib/uploads";

export async function zipFiles(
  entries: Array<{ storedPath: string; name: string }>,
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
    const file = await readStoredAsset(entry.storedPath);
    if (file) {
      archive.append(file, { name: entry.name });
    }
  }

  await archive.finalize();
  await finished;
  return Buffer.concat(chunks);
}
