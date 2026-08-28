/**
 * Standalone sticker smoke test (Responses API, not wired to order flow).
 *
 * Loads StickerTemplate.designReferenceImageUrl and StickerCostume.promptHint
 * from the DB, then generates via gpt-5.6 + gpt-image-2.
 *
 * Usage:
 *   npx tsx scripts/test-sticker.ts --character ./test-character.png --template first-birthday --costume butterfly --phrase "첫돌 축하해요"
 */
import { readFileSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import {
  IMAGE_GEN_QUALITY,
  IMAGE_GEN_SIZE,
  IMAGE_GEN_TOOL_MODEL,
  RESPONSES_MODEL,
  generateIllustrationViaResponsesAPI,
  loadImageAsset,
} from "../src/lib/openai-illustration";

/** gpt-5.6-sol short-context rates (USD per 1M tokens). */
const GPT_5_6_RATES = {
  input: 4,
  cachedInput: 0.4,
  output: 20,
} as const;

type ResponsesUsage = NonNullable<OpenAI.Responses.Response["usage"]>;

type CliArgs = {
  character: string;
  template: string;
  costume: string;
  phrase: string;
  out?: string;
};

function printUsage(): never {
  console.error(`Usage:
  npx tsx scripts/test-sticker.ts --character <localImagePath> --template <stickerTemplateKey> --costume <stickerCostumeKey> --phrase "<text>" [--out <pngPath>]

Example:
  npx tsx scripts/test-sticker.ts --character ./test-character.png --template first-birthday --costume butterfly --phrase "첫돌 축하해요"
  npx tsx scripts/test-sticker.ts --character ./test-character.png --template first-birthday --costume none --phrase "감사합니다"
`);
  process.exit(1);
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string> = {};
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
    args[key] = value;
    i += 1;
  }

  if (!args.character?.trim()) {
    console.error("--character is required (local image path)");
    printUsage();
  }
  if (!args.template?.trim()) {
    console.error("--template is required (StickerTemplate.key, e.g. first-birthday)");
    printUsage();
  }
  if (!args.costume?.trim()) {
    console.error("--costume is required (StickerCostume.key, e.g. butterfly)");
    printUsage();
  }
  if (!args.phrase?.trim()) {
    console.error('--phrase is required (e.g. "첫돌 축하해요")');
    printUsage();
  }

  return {
    character: args.character.trim(),
    template: args.template.trim(),
    costume: args.costume.trim(),
    phrase: args.phrase.trim(),
    out: args.out?.trim(),
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

function usdFromTokens(tokens: number, ratePerMillion: number): number {
  return (tokens / 1_000_000) * ratePerMillion;
}

function logResponsesApiUsage(usage: ResponsesUsage | undefined, elapsedMs: number) {
  console.log(`elapsed=${(elapsedMs / 1000).toFixed(2)}s`);
  if (!usage) {
    console.log("usage: (not returned)");
    return;
  }

  const cachedIn = usage.input_tokens_details?.cached_tokens ?? 0;
  const uncachedIn = Math.max(0, usage.input_tokens - cachedIn);
  const reasoningOut = usage.output_tokens_details?.reasoning_tokens ?? 0;
  const mainlineUsd =
    usdFromTokens(uncachedIn, GPT_5_6_RATES.input) +
    usdFromTokens(cachedIn, GPT_5_6_RATES.cachedInput) +
    usdFromTokens(usage.output_tokens, GPT_5_6_RATES.output);

  console.log(
    `mainline tokens (${RESPONSES_MODEL}): input=${usage.input_tokens} (cached=${cachedIn}) output=${usage.output_tokens} (reasoning=${reasoningOut}) total=${usage.total_tokens}`,
  );
  console.log(`estimated mainline cost=$${mainlineUsd.toFixed(4)}`);
  console.log(
    `image tool (${IMAGE_GEN_TOOL_MODEL}): token usage is not itemized in response.usage; billed separately at gpt-image-2 rates`,
  );
}

function slugPhrase(phrase: string): string {
  const slug = phrase
    .replace(/\s+/g, "-")
    .replace(/[^\w가-힣-]/g, "")
    .slice(0, 24);
  return slug || "sticker";
}

function buildStickerPrompt(input: {
  phrase: string;
  costumeHint: string;
}): string {
  return [
    "Image roles:",
    "- The first image is the character reference.",
    "- The second image is the sticker frame/design reference.",
    "",
    "Character identity (first image):",
    "CRITICAL: This is the SAME child as the reference image, not a similar-looking child.",
    "Copy the exact facial structure: eye shape and spacing, nose shape, mouth shape, cheek fullness, and face proportions from the reference image precisely.",
    "Do not idealize, adjust, or subtly redesign the face. Any deviation from the reference face is an error.",
    "Also preserve hairstyle, hair color, and skin tone with very high fidelity.",
    "Do not reinterpret or redesign the character's face or hair. If the reference is an upper-body crop, naturally extend to a full body when the sticker needs it.",
    "Clothing and outfit follow the costume instruction below — do not keep the original outfit unless that instruction says to.",
    "",
    "Costume:",
    input.costumeHint.trim(),
    "",
    "Frame / design (second image):",
    "Match the second image's decorative frame shape, colors, and ornamental layout style exactly. If the second image contains text, replace it with exactly this phrase: " +
      `'${input.phrase}'` +
      " — do not keep any original text from the reference.",
    "The entire design must be enclosed within a clean, solid circular border/outline (like a badge or coin shape) — this circular edge defines the die-cut boundary for printing. Everything (character, flowers, text) must stay within this circle. The area outside the circle must be plain white, providing cutting margin.",
    "",
    "Background:",
    "plain white background, sticker design, no shadows, isolated illustration",
    "",
    "Safety and output constraints:",
    "Create a gentle, child-friendly sticker illustration.",
    "No scary, violent, sexual, or otherwise inappropriate content.",
  ].join("\n");
}

async function main() {
  loadEnvFiles();
  const cli = parseArgs(process.argv.slice(2));

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const prisma = new PrismaClient();
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 10 * 60 * 1000,
  });

  try {
    const template = await prisma.stickerTemplate.findUnique({
      where: { key: cli.template },
    });
    if (!template) {
      throw new Error(`StickerTemplate not found for key="${cli.template}"`);
    }
    if (!template.designReferenceImageUrl) {
      throw new Error(
        `StickerTemplate "${cli.template}" has no designReferenceImageUrl. Update seed/DB first.`,
      );
    }

    const costume = await prisma.stickerCostume.findUnique({
      where: { key: cli.costume },
    });
    if (!costume) {
      throw new Error(`StickerCostume not found for key="${cli.costume}"`);
    }
    if (!costume.isActive) {
      throw new Error(`StickerCostume "${cli.costume}" is inactive`);
    }
    if (!costume.promptHint.trim()) {
      throw new Error(
        `StickerCostume "${cli.costume}" has an empty promptHint. Update seed/DB first.`,
      );
    }

    const prompt = buildStickerPrompt({
      phrase: cli.phrase,
      costumeHint: costume.promptHint,
    });

    console.log("=== Final prompt ===");
    console.log(prompt);
    console.log("====================");
    console.log(`size=${IMAGE_GEN_SIZE} quality=${IMAGE_GEN_QUALITY}`);
    console.log(
      `template=${template.key} (${template.label}) design=${template.designReferenceImageUrl}`,
    );
    console.log(`costume=${costume.key} (${costume.label})`);
    console.log(`phrase=${cli.phrase}`);
    console.log(`character=${path.resolve(cli.character)}`);

    const character = await loadImageAsset(path.resolve(cli.character));
    const design = await loadImageAsset(template.designReferenceImageUrl);

    const generated = await generateIllustrationViaResponsesAPI({
      openai,
      prompt,
      characters: [character],
      style: design,
      quality: IMAGE_GEN_QUALITY,
    });

    logResponsesApiUsage(generated.usage, generated.elapsedMs);
    console.log("=== Revised prompt ===");
    console.log(generated.revisedPrompt ?? "(not returned)");
    console.log("======================");

    const outDir = path.join(process.cwd(), "scripts", "output");
    await mkdir(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const defaultName = `sticker-${template.key}-${costume.key}-${slugPhrase(cli.phrase)}-${stamp}.png`;
    const outPath = path.resolve(cli.out ?? path.join(outDir, defaultName));
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, Buffer.from(generated.b64, "base64"));

    console.log(`Saved: ${outPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
