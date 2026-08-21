import { createReadStream } from "fs";
import { ZipArchive } from "archiver";
import { fileExists } from "@/lib/files";

export async function zipFiles(
  entries: Array<{ filepath: string; name: string }>,
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
    if (await fileExists(entry.filepath)) {
      archive.append(createReadStream(entry.filepath), { name: entry.name });
    }
  }

  await archive.finalize();
  await finished;
  return Buffer.concat(chunks);
}
