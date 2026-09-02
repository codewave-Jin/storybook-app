/**
 * Standalone gpt-image-2 expression-diversity test (not wired to order flow).
 *
 * Generates one scene per run so identity/art style stay locked while
 * expression and pose can change with the scene.
 *
 * Usage (from storybook-app):
 *   npx tsx scripts/test-illustration.ts
 *   npx tsx scripts/test-illustration.ts 0
 *   npx tsx scripts/test-illustration.ts 2
 *
 * Inputs:
 *   scripts/test-assets/character.png
 *   scripts/test-assets/scenes.json
 *
 * Outputs:
 *   scripts/test-output/scene-{index}-{timestamp}.png
 */
import { existsSync, readFileSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const RESPONSES_MODEL = "gpt-5.6" as const;
const IMAGE_GEN_TOOL_MODEL = "gpt-image-2" as const;
const IMAGE_GEN_SIZE = "1024x1024" as const;
const IMAGE_GEN_QUALITY = "high" as const;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(SCRIPT_DIR, "test-assets");
const OUTPUT_DIR = path.join(SCRIPT_DIR, "test-output");
const CHARACTER_PATH = path.join(ASSETS_DIR, "character.png");
const SCENES_PATH = path.join(ASSETS_DIR, "scenes.json");

type ResponsesUsage = NonNullable<OpenAI.Responses.Response["usage"]>;

type SceneEntry = {
  scene: string;
  expression?: string;
};

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

function buildScenePrompt(entry: SceneEntry): string {
  const keepAndChange = entry.expression
    ? [
        "[유지할 것] 얼굴형, 이목구비의 생김새, 헤어스타일, 의상, 그림체",
        `[변경할 것] 포즈, 배경, 그리고 표정: ${entry.expression}`,
        "표정은 눈과 입의 변화로만 표현하고 얼굴형과 볼살은 유지하세요",
      ]
    : [
        "[유지할 것] 얼굴형, 이목구비의 생김새, 표정, 헤어스타일, 의상, 그림체",
        "[변경할 것] 포즈와 배경만 장면에 맞게 표현",
      ];

  return [
    `이 캐릭터의 정체성과 그림체를 유지하면서 다음 장면을 그려주세요: ${entry.scene}`,
    "",
    ...keepAndChange,
    "",
    "얼굴에 사진 질감이나 광택 렌더링을 넣지 마세요.",
  ].join("\n");
}

function parseScenes(raw: unknown): SceneEntry[] {
  if (!Array.isArray(raw)) {
    throw new Error("scenes.json must be an array of { scene, expression? } objects");
  }

  const scenes = raw.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid scene at index ${index} in scenes.json`);
    }
    const scene =
      "scene" in item && typeof (item as { scene: unknown }).scene === "string"
        ? (item as { scene: string }).scene.trim()
        : "";
    if (!scene) {
      throw new Error(
        `Invalid scene at index ${index} in scenes.json (need non-empty scene)`,
      );
    }
    const expressionRaw =
      "expression" in item &&
      typeof (item as { expression: unknown }).expression === "string"
        ? (item as { expression: string }).expression.trim()
        : "";
    return expressionRaw ? { scene, expression: expressionRaw } : { scene };
  });

  if (scenes.length === 0) {
    throw new Error("scenes.json is empty");
  }

  return scenes;
}

function parseSceneIndex(argv: string[], sceneCount: number): number {
  const raw = argv[0]?.trim();
  if (!raw) {
    return 0;
  }

  if (!/^\d+$/.test(raw)) {
    throw new Error(
      `Scene index must be a non-negative integer, got "${raw}"\nUsage: npx tsx scripts/test-illustration.ts [index]`,
    );
  }

  const index = Number(raw);
  if (index >= sceneCount) {
    throw new Error(
      `Scene index ${index} is out of range (scenes.json has ${sceneCount} scene(s), valid: 0–${sceneCount - 1})`,
    );
  }

  return index;
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

async function generateSceneImage(opts: {
  openai: OpenAI;
  prompt: string;
  characterBytes: Buffer;
  characterMime: string;
}): Promise<{ b64: string; elapsedMs: number; usage?: ResponsesUsage }> {
  const startedAt = Date.now();
  const result = await opts.openai.responses.create({
    model: RESPONSES_MODEL,
    tools: [
      {
        type: "image_generation",
        model: IMAGE_GEN_TOOL_MODEL,
        size: IMAGE_GEN_SIZE,
        quality: IMAGE_GEN_QUALITY,
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
            image_url: toImageDataUrl(opts.characterBytes, opts.characterMime),
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

  if (!existsSync(CHARACTER_PATH)) {
    throw new Error(
      `Character image not found: ${CHARACTER_PATH}\nPlace a style-converted character PNG at scripts/test-assets/character.png and re-run.`,
    );
  }
  if (!existsSync(SCENES_PATH)) {
    throw new Error(`scenes.json not found: ${SCENES_PATH}`);
  }

  const scenes = parseScenes(JSON.parse(await readFile(SCENES_PATH, "utf8")));
  const sceneIndex = parseSceneIndex(process.argv.slice(2), scenes.length);
  const entry = scenes[sceneIndex];
  const prompt = buildScenePrompt(entry);

  const characterBytes = await readFile(CHARACTER_PATH);
  const characterMime = guessImageMime(CHARACTER_PATH);
  await mkdir(OUTPUT_DIR, { recursive: true });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 10 * 60 * 1000,
  });

  const outName = `scene-${sceneIndex}-${timestampForFilename()}.png`;
  const outPath = path.join(OUTPUT_DIR, outName);

  console.log(
    `model=${RESPONSES_MODEL} tool=${IMAGE_GEN_TOOL_MODEL} size=${IMAGE_GEN_SIZE} quality=${IMAGE_GEN_QUALITY}`,
  );
  console.log(`character=${CHARACTER_PATH}`);
  console.log(`scenes=${SCENES_PATH} (index=${sceneIndex}/${scenes.length - 1})`);
  console.log(`scene=${entry.scene}`);
  console.log(`expression=${entry.expression ?? "(keep original)"}`);
  console.log(`output=${outPath}`);
  console.log("");
  console.log("=== Prompt ===");
  console.log(prompt);
  console.log("==============");
  console.log(
    `Calling responses.create model=${RESPONSES_MODEL} tool=${IMAGE_GEN_TOOL_MODEL} size=${IMAGE_GEN_SIZE} quality=${IMAGE_GEN_QUALITY}...`,
  );

  const startedAt = Date.now();
  try {
    const generated = await generateSceneImage({
      openai,
      prompt,
      characterBytes,
      characterMime,
    });
    await writeFile(outPath, Buffer.from(generated.b64, "base64"));
    console.log(`elapsed=${formatElapsed(generated.elapsedMs)}`);
    logUsage(generated.usage);
    console.log(`Saved: ${outPath}`);
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[scene ${sceneIndex}] FAILED after ${formatElapsed(elapsedMs)}: ${message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
