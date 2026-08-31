/**
 * Create a forest-template order and run preview generation (pages 1–3)
 * through the same path as createOrder: PageTemplate substitution +
 * Responses API (gpt-image-2).
 *
 * This script copies real PNG/JPG files onto the demo user as characters.
 *
 * Usage:
 *   npx tsx scripts/test-order-preview.ts --character ./test-character.png
 *   npx tsx scripts/test-order-preview.ts --character ./test-character.png --character ./test-character-2.png --style watercolor
 */
import { copyFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { TEST_ILLUSTRATION_VARIABLES } from "../src/lib/illustration-prompt";
import { startOrderPreviewGeneration } from "../src/lib/preview-generation";

const DEMO_EMAIL = "test@codewave.im";
const FOREST_TEMPLATE_TITLE = "숲속 친구들과의 하루";

type CliArgs = {
  characters: string[];
  style: string;
};

function printUsage(): never {
  console.error(`Usage:
  npx tsx scripts/test-order-preview.ts --character <localImagePath> [--character <path>] [--style watercolor]

Example:
  npx tsx scripts/test-order-preview.ts --character ./test-character.png --style watercolor
`);
  process.exit(1);
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string> = {};
  const characters: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      console.error(`Missing value for --${key}`);
      printUsage();
    }
    if (key === "character") {
      characters.push(value);
    } else {
      args[key] = value;
    }
    i += 1;
  }

  if (characters.length < 1) {
    console.error("--character is required (local image path, repeatable up to 3)");
    printUsage();
  }
  if (characters.length > 3) {
    console.error("--character can be passed at most 3 times");
    printUsage();
  }

  return {
    characters: characters.map((item) => item.trim()).filter(Boolean),
    style: args.style?.trim() || "watercolor",
  };
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

function customInputValuesFromTestVars() {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(TEST_ILLUSTRATION_VARIABLES)) {
    if (key.startsWith("answer.")) {
      values[key.slice("answer.".length)] = value;
    }
  }
  return values;
}

async function persistCharacterImage(sourcePath: string) {
  const resolved = path.resolve(sourcePath);
  const ext = path.extname(resolved) || ".png";
  const destDir = path.join(process.cwd(), "public", "uploads", "characters");
  await mkdir(destDir, { recursive: true });
  const filename = `${randomUUID()}${ext}`;
  await copyFile(resolved, path.join(destDir, filename));
  return `/uploads/characters/${filename}`;
}

async function main() {
  loadEnvFiles();
  const cli = parseArgs(process.argv.slice(2));

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  if (process.env.COMFY_MOCK?.trim().match(/^(1|true|yes)$/i)) {
    throw new Error("COMFY_MOCK is enabled; disable it to test Responses API generation");
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Demo user ${DEMO_EMAIL} not found. Run \`npx prisma db seed\` first.`,
      );
    }

    const template = await prisma.storybookTemplate.findFirst({
      where: { title: FOREST_TEMPLATE_TITLE },
      include: { pageTemplates: { select: { pageNumber: true } } },
    });
    if (!template) {
      throw new Error(
        `Template "${FOREST_TEMPLATE_TITLE}" not found. Run \`npx prisma db seed\` first.`,
      );
    }
    if (template.pageTemplates.length < 3) {
      throw new Error(
        `Template "${FOREST_TEMPLATE_TITLE}" needs page templates 1–3.`,
      );
    }

    const artStyle = await prisma.artStyle.findUnique({
      where: { key: cli.style },
    });
    if (!artStyle?.referenceImageUrl) {
      throw new Error(
        `ArtStyle "${cli.style}" not found or has no referenceImageUrl.`,
      );
    }

    const characterIds: string[] = [];
    for (let index = 0; index < cli.characters.length; index += 1) {
      const characterPath = cli.characters[index];
      const publicPath = await persistCharacterImage(characterPath);
      const character = await prisma.character.create({
        data: {
          userId: user.id,
          label: index === 0 ? "지민" : `테스트 캐릭터 ${index + 1}`,
          gender: index % 2 === 0 ? "FEMALE" : "MALE",
          originalPhotoPath: publicPath,
          generatedImagePath: publicPath,
          status: "COMPLETED",
        },
      });
      characterIds.push(character.id);
      console.log(`character ${index + 1}=${character.label} ${publicPath}`);
    }

    const order = await prisma.storybookOrder.create({
      data: {
        userId: user.id,
        templateId: template.id,
        selectedCharacterIds: characterIds,
        customInputValues: customInputValuesFromTestVars(),
        artStyleId: artStyle.id,
        paymentStatus: "PENDING",
        productionStatus: "WAITING",
      },
    });

    console.log(`order=${order.id}`);
    console.log(`style=${artStyle.key} ref=${artStyle.referenceImageUrl}`);
    console.log("Generating preview pages 1–3 (this can take several minutes)...");

    await startOrderPreviewGeneration(order.id, { wait: true });

    const illustrations = await prisma.illustration.findMany({
      where: { orderId: order.id },
      orderBy: { pageNumber: "asc" },
      select: {
        pageNumber: true,
        pageType: true,
        status: true,
        prompt: true,
        imagePath: true,
      },
    });

    console.log("=== Preview illustrations ===");
    for (const page of illustrations) {
      console.log(
        `p${page.pageNumber} ${page.pageType} ${page.status} image=${page.imagePath ?? "(none)"}`,
      );
      console.log(`  prompt: ${page.prompt}`);
    }

    const failed = illustrations.filter((page) => page.status !== "COMPLETED");
    if (failed.length > 0) {
      throw new Error(
        `${failed.length} preview page(s) did not complete: ${failed
          .map((page) => `p${page.pageNumber}=${page.status}`)
          .join(", ")}`,
      );
    }

    console.log(`Preview ready. Open /dashboard/orders/${order.id}/preview`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
