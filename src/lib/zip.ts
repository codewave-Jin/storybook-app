import { createReadStream } from "fs";
import { fileExists } from "@/lib/files";

type ZipArchive = {
  on(event: "data", cb: (chunk: Buffer) => void): void;
  on(event: "end", cb: () => void): void;
  on(event: "error", cb: (error: Error) => void): void;
  append(source: NodeJS.ReadableStream, data: { name: string }): void;
  finalize(): Promise<void> | void;
};

function createZipArchive() {
  const createArchiver = require("archiver") as (
    format: "zip",
    options: { zlib: { level: number } },
  ) => ZipArchive;

  return createArchiver("zip", { zlib: { level: 9 } });
}

export async function zipFiles(
  entries: Array<{ filepath: string; name: string }>,
) {
  const archive = createZipArchive();
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
