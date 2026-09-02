/**
 * Run GPT style transfer for one CharacterAsset.
 *
 * Usage (from storybook-app):
 *   npx tsx scripts/test-style-character.ts <characterAssetId>
 */
import { readFileSync } from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { styleCharacter } from "../src/lib/styleCharacter";

function printUsage(): never {
  console.error(`Usage:
  npx tsx scripts/test-style-character.ts <characterAssetId>
`);
  process.exit(1);
}

function loadEnvFiles() {
  for (const name of [".env", ".env.local"]) {
    const filePath = path.join(process.cwd(), name);
    try {
      const text = readFileSync(filePath, "utf8");
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }
        const eq = trimmed.indexOf("=");
        if (eq <= 0) {
          continue;
        }
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    } catch {
      // optional
    }
  }
}

function formatElapsed(elapsedMs: number): string {
  return `${(elapsedMs / 1000).toFixed(2)}s`;
}

async function main() {
  loadEnvFiles();

  const characterAssetId = process.argv[2]?.trim();
  if (!characterAssetId) {
    printUsage();
  }

  const asset = await prisma.characterAsset.findUnique({
    where: { id: characterAssetId },
    include: {
      character: { select: { id: true, label: true, generatedImagePath: true } },
      artStyle: { select: { id: true, key: true, label: true, referenceImageUrl: true } },
    },
  });

  if (!asset) {
    throw new Error(`CharacterAsset not found: ${characterAssetId}`);
  }

  console.log(`asset=${asset.id} status=${asset.status} retryCount=${asset.retryCount}`);
  console.log(
    `character=${asset.character.id} label=${asset.character.label}`,
  );
  console.log(
    `artStyle=${asset.artStyle.key} (${asset.artStyle.label}) ref=${asset.artStyle.referenceImageUrl}`,
  );
  console.log(`rawPortraitUrl=${asset.rawPortraitUrl}`);
  console.log("Calling styleCharacter()...");

  const startedAt = Date.now();
  const result = await styleCharacter(characterAssetId);
  const elapsedMs = Date.now() - startedAt;

  console.log(`elapsed=${formatElapsed(elapsedMs)}`);

  const updated = await prisma.characterAsset.findUnique({
    where: { id: characterAssetId },
    select: { status: true, retryCount: true, styledImageUrl: true },
  });

  console.log(
    `status=${updated?.status} retryCount=${updated?.retryCount}`,
  );
  console.log(`styledImageUrl=${updated?.styledImageUrl ?? result.styledImageUrl ?? "(none)"}`);

  if (result.error || !result.success) {
    throw new Error(result.error ?? "styleCharacter failed");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
