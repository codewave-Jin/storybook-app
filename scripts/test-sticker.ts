/**
 * Standalone sticker smoke test for the pre-composited base-image flow.
 *
 * GPT receives one image (frame + character sheet already composited) and
 * only changes costume / phrase. Not wired to the order queue.
 *
 * Usage (from storybook-app):
 *   npx tsx scripts/test-sticker.ts "노란색 나비 옷" "소민이 생일을 축하해주셔서 감사합니다"
 *
 * Input:
 *   scripts/test-assets/sticker-base.png
 *
 * Output:
 *   scripts/test-output/sticker-{timestamp}.jpg
 */
import { existsSync, readFileSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const RESPONSES_MODEL = "gpt-5.6" as const;
const IMAGE_GEN_TOOL_MODEL = "gpt-image-2" as const;
const IMAGE_GEN_SIZE = "1024x1024" as const;
const OUTPUT_FORMAT = "jpeg" as const;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(SCRIPT_DIR, "test-assets");
const OUTPUT_DIR = path.join(SCRIPT_DIR, "test-output");
const BASE_IMAGE_PATH = path.join(ASSETS_DIR, "sticker-base.png");

type ImageGenerationQuality = "low" | "medium" | "high";
type ResponsesUsage = NonNullable<OpenAI.Responses.Response["usage"]>;

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

function parseImageQuality(raw: string | undefined): ImageGenerationQuality {
  const value = raw?.trim().toLowerCase();
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "medium";
}

function printUsage(): never {
  console.error(`Usage:
  npx tsx scripts/test-sticker.ts "<costume>" "<phrase>"

Example:
  npx tsx scripts/test-sticker.ts "노란색 나비 옷" "소민이 생일을 축하해주셔서 감사합니다"
`);
  process.exit(1);
}

function parseArgs(argv: string[]): { costume: string; phrase: string } {
  const costume = argv[0]?.trim() ?? "";
  const phrase = argv[1]?.trim() ?? "";
  if (!costume || !phrase || argv.length !== 2) {
    printUsage();
  }
  return { costume, phrase };
}

function guessImageMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  if (ext === ".gif") {
    return "image/gif";
  }
  return "image/png";
}

function toImageDataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function buildStickerPrompt(costume: string, phrase: string): string {
  return [
    `해당 사진 안의 캐릭터를 ${costume} 입은 캐릭터로 바꿔주고`,
    `"${phrase}" 라는 문구를 넣어줘.`,
    "원형 스티커로 만들 거니까 꾸며주되 캐릭터의 닮은꼴이 바뀌면 안 돼.",
  ].join("\n");
}

function timestampForFilename(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function formatElapsed(elapsedMs: number): string {
  return `${(elapsedMs / 1000).toFixed(2)}s`;
}

function logUsage(usage: ResponsesUsage | undefined) {
  if (!usage) {
    console.log("usage: (not returned)");
    return;
  }

  const cachedIn = usage.input_tokens_details?.cached_tokens ?? 0;
  const reasoningOut = usage.output_tokens_details?.reasoning_tokens ?? 0;
  console.log(
    `mainline tokens (${RESPONSES_MODEL}): input=${usage.input_tokens} (cached=${cachedIn}) output=${usage.output_tokens} (reasoning=${reasoningOut}) total=${usage.total_tokens}`,
  );
  console.log(
    `image tool (${IMAGE_GEN_TOOL_MODEL}): token usage is not itemized in response.usage; billed separately at gpt-image-2 rates`,
  );
}

async function generateStickerImage(opts: {
  openai: OpenAI;
  prompt: string;
  imageBytes: Buffer;
  imageMime: string;
  quality: ImageGenerationQuality;
}): Promise<{ b64: string; elapsedMs: number; usage?: ResponsesUsage }> {
  const startedAt = Date.now();
  const result = await opts.openai.responses.create({
    model: RESPONSES_MODEL,
    tools: [
      {
        type: "image_generation",
        model: IMAGE_GEN_TOOL_MODEL,
        size: IMAGE_GEN_SIZE,
        quality: opts.quality,
        output_format: OUTPUT_FORMAT,
      },
    ],
    tool_choice: { type: "image_generation" },
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: opts.prompt },
          {
            type: "input_image",
            image_url: toImageDataUrl(opts.imageBytes, opts.imageMime),
            detail: "high",
          },
        ],
      },
    ],
  });
  const elapsedMs = Date.now() - startedAt;

  const imageCall = result.output.find(
    (item) => item.type === "image_generation_call",
  );
  if (!imageCall || imageCall.type !== "image_generation_call") {
    throw new Error(
      `No image_generation_call in response: ${JSON.stringify(result.output.map((item) => item.type))}`,
    );
  }

  const b64 = imageCall.result;
  if (!b64) {
    throw new Error(
      `image_generation_call has no result (status=${imageCall.status})`,
    );
  }

  return { b64, elapsedMs, usage: result.usage };
}

async function main() {
  loadEnvFiles();

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const { costume, phrase } = parseArgs(process.argv.slice(2));
  const quality = parseImageQuality(process.env.IMAGE_QUALITY);

  if (!existsSync(BASE_IMAGE_PATH)) {
    throw new Error(
      `Sticker base image not found: ${BASE_IMAGE_PATH}\nPlace the pre-composited PNG at scripts/test-assets/sticker-base.png and re-run.`,
    );
  }

  const prompt = buildStickerPrompt(costume, phrase);
  const imageBytes = await readFile(BASE_IMAGE_PATH);
  const imageMime = guessImageMime(BASE_IMAGE_PATH);
  await mkdir(OUTPUT_DIR, { recursive: true });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 10 * 60 * 1000,
  });

  const outName = `sticker-${timestampForFilename()}.jpg`;
  const outPath = path.join(OUTPUT_DIR, outName);

  console.log(
    `model=${RESPONSES_MODEL} tool=${IMAGE_GEN_TOOL_MODEL} size=${IMAGE_GEN_SIZE} quality=${quality} output_format=${OUTPUT_FORMAT}`,
  );
  console.log(`base=${BASE_IMAGE_PATH}`);
  console.log(`costume=${costume}`);
  console.log(`phrase=${phrase}`);
  console.log(`output=${outPath}`);
  console.log("");
  console.log("=== Prompt ===");
  console.log(prompt);
  console.log("==============");
  console.log(
    `Calling responses.create model=${RESPONSES_MODEL} tool=${IMAGE_GEN_TOOL_MODEL} size=${IMAGE_GEN_SIZE} quality=${quality}...`,
  );

  const startedAt = Date.now();
  try {
    const generated = await generateStickerImage({
      openai,
      prompt,
      imageBytes,
      imageMime,
      quality,
    });
    await writeFile(outPath, Buffer.from(generated.b64, "base64"));
    console.log(`elapsed=${formatElapsed(generated.elapsedMs)}`);
    logUsage(generated.usage);
    console.log(`Saved: ${outPath}`);
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAILED after ${formatElapsed(elapsedMs)}: ${message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
