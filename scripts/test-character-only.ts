/**
 * Diagnostic: character-only images.edit (no style reference).
 *
 * Usage:
 *   npx tsx scripts/test-character-only.ts --character ./test-character.png
 */
import { readFileSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import OpenAI, { toFile } from "openai";

const IMAGE_MODEL = "gpt-image-1.5" as const;
const INPUT_FIDELITY = "high" as const;
const PROMPT =
  "Redraw this exact child character with the same face, hairstyle, and outfit, in a simple standing pose against a plain light background. Preserve facial features and proportions with high fidelity.";

/** gpt-image-1.5 token rates (USD per 1M tokens). */
const GPT_IMAGE_1_5_RATES = {
  textInput: 5,
  imageInput: 8,
  textOutput: 10,
  imageOutput: 32,
} as const;

type ImageEditUsage = NonNullable<OpenAI.ImagesResponse["usage"]>;

type CliArgs = {
  character: string;
  out?: string;
};

function printUsage(): never {
  console.error(`Usage:
  npx tsx scripts/test-character-only.ts --character <localImagePath> [--out <pngPath>]

Example:
  npx tsx scripts/test-character-only.ts --character ./test-character.png
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

  return {
    character: args.character.trim(),
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

function guessMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  return "image/png";
}

function usdFromTokens(tokens: number, ratePerMillion: number): number {
  return (tokens / 1_000_000) * ratePerMillion;
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

function logEditUsage(usage: ImageEditUsage | undefined, elapsedMs: number) {
  console.log(`elapsed=${(elapsedMs / 1000).toFixed(2)}s`);
  if (!usage) {
    console.log("usage: (not returned)");
    return;
  }

  const textIn = usage.input_tokens_details?.text_tokens ?? 0;
  const imageIn = usage.input_tokens_details?.image_tokens ?? 0;
  const textOut = usage.output_tokens_details?.text_tokens ?? 0;
  const imageOut =
    usage.output_tokens_details?.image_tokens ??
    Math.max(0, usage.output_tokens - textOut);

  const textInUsd = usdFromTokens(textIn, GPT_IMAGE_1_5_RATES.textInput);
  const imageInUsd = usdFromTokens(imageIn, GPT_IMAGE_1_5_RATES.imageInput);
  const textOutUsd = usdFromTokens(textOut, GPT_IMAGE_1_5_RATES.textOutput);
  const imageOutUsd = usdFromTokens(imageOut, GPT_IMAGE_1_5_RATES.imageOutput);
  const totalUsd = textInUsd + imageInUsd + textOutUsd + imageOutUsd;

  console.log(
    `tokens: input=${usage.input_tokens} (text=${textIn}, image=${imageIn}) output=${usage.output_tokens} (text=${textOut}, image=${imageOut}) total=${usage.total_tokens}`,
  );
  console.log(
    `estimated cost=${formatUsd(totalUsd)} (text in ${formatUsd(textInUsd)} + image in ${formatUsd(imageInUsd)} + text out ${formatUsd(textOutUsd)} + image out ${formatUsd(imageOutUsd)})`,
  );
}

async function main() {
  loadEnvFiles();
  const cli = parseArgs(process.argv.slice(2));

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const characterPath = path.resolve(cli.character);
  const characterBytes = await readFile(characterPath);
  const characterFile = await toFile(characterBytes, path.basename(characterPath), {
    type: guessMime(characterPath),
  });

  console.log("=== Final prompt ===");
  console.log(PROMPT);
  console.log("====================");
  console.log(`character=${characterPath}`);

  console.log(
    `Calling OpenAI images.edit (model=${IMAGE_MODEL}, input_fidelity=${INPUT_FIDELITY}, images=character-only)...`,
  );
  const startedAt = Date.now();
  const result = await openai.images.edit({
    model: IMAGE_MODEL,
    image: [characterFile],
    prompt: PROMPT,
    input_fidelity: INPUT_FIDELITY,
  });
  const elapsedMs = Date.now() - startedAt;
  logEditUsage(result.usage, elapsedMs);

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(
      `No b64_json in response: ${JSON.stringify(result).slice(0, 500)}`,
    );
  }

  const outDir = path.join(process.cwd(), "scripts", "output");
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultName = `character-only-${stamp}.png`;
  const outPath = path.resolve(cli.out ?? path.join(outDir, defaultName));
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, Buffer.from(b64, "base64"));

  console.log(`Saved: ${outPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
