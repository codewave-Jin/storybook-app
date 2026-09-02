/**
 * Create (or reuse) a CharacterAsset for styleCharacter testing.
 *
 * Usage (from storybook-app):
 *   npx tsx scripts/create-test-asset.ts
 *   npx tsx scripts/create-test-asset.ts <characterId>
 *   npx tsx scripts/create-test-asset.ts <characterId> watercolor
 */
import { readFileSync } from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";

const DEFAULT_ART_STYLE_KEY = "watercolor";

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

async function main() {
  loadEnvFiles();

  const characterIdArg = process.argv[2]?.trim() || "";
  const artStyleKey = process.argv[3]?.trim() || DEFAULT_ART_STYLE_KEY;

  const character = characterIdArg
    ? await prisma.character.findUnique({ where: { id: characterIdArg } })
    : await prisma.character.findFirst({
        where: { generatedImagePath: { not: null } },
        orderBy: { createdAt: "desc" },
      });

  if (!character) {
    if (characterIdArg) {
      throw new Error(`Character not found: ${characterIdArg}`);
    }
    throw new Error("No Character with generatedImagePath found");
  }

  if (!character.generatedImagePath?.trim()) {
    throw new Error(
      `Character ${character.id} has no generatedImagePath (ComfyUI output required)`,
    );
  }

  const artStyle = await prisma.artStyle.findUnique({
    where: { key: artStyleKey },
  });
  if (!artStyle) {
    throw new Error(`ArtStyle not found for key="${artStyleKey}"`);
  }
  if (!artStyle.referenceImageUrl?.trim()) {
    throw new Error(
      `ArtStyle "${artStyle.key}" has no referenceImageUrl`,
    );
  }

  console.log(`character.id=${character.id}`);
  console.log(`character.generatedImagePath=${character.generatedImagePath}`);
  console.log(`artStyle.key=${artStyle.key}`);
  console.log(`artStyle.label=${artStyle.label}`);
  console.log(`artStyle.referenceImageUrl=${artStyle.referenceImageUrl}`);

  const existing = await prisma.characterAsset.findFirst({
    where: {
      characterId: character.id,
      artStyleId: artStyle.id,
    },
    orderBy: { createdAt: "asc" },
  });

  const asset =
    existing ??
    (await prisma.characterAsset.create({
      data: {
        characterId: character.id,
        artStyleId: artStyle.id,
        rawPortraitUrl: character.generatedImagePath,
        status: "PENDING",
      },
    }));

  if (existing) {
    console.log(
      `Reusing existing CharacterAsset (characterId + artStyleId already present)`,
    );
  } else {
    console.log("Created new CharacterAsset");
  }

  console.log("");
  console.log("========================================");
  console.log(`assetId: ${asset.id}`);
  console.log("========================================");
  console.log("");
  console.log("Next:");
  console.log(`  npx tsx scripts/test-style-character.ts ${asset.id}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
