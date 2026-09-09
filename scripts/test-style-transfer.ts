/**
 * Standalone copy of service step 2: styleCharacter.
 * Portrait + art-style reference only. No scene, no order queue.
 *
 * Usage (from storybook-app):
 *   npx tsx scripts/test-style-transfer.ts
 *   npx tsx scripts/test-style-transfer.ts --portrait ./test-character.png --style ./public/art-styles/watercolor_style.png
 *
 * Output:
 *   scripts/test-output/style-transfer-{quality}-{timestamp}.jpg
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

const STYLE_CHARACTER_PROMPT = [
  "첫 번째 이미지는 캐릭터, 두 번째 이미지는 그림체 레퍼런스입니다.",
  "첫 번째 이미지의 캐릭터를 두 번째 이미지와 완전히 동일한 그림체로 다시 그려주세요.",
  "",
  "[반드시 유지할 것]",
  "- 얼굴형, 눈·코·입의 모양과 비율, 볼살",
  "- 헤어스타일, 의상",
  "- 정면 상반신 구도",
  "",
  "[반드시 바꿀 것]",
  "- 렌더링 방식 전부: 광택, 하이라이트, 사실적인 피부 음영을 모두 제거",
  "- 선, 채색, 질감을 두 번째 레퍼런스와 완전히 동일하게 통일",
  "- 표정은 중립적인 무표정 또는 아주 옅은 미소로",
  "",
  "배경은 밝은 단색으로 해주세요.",
].join("\n");

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(SCRIPT_DIR, "test-output");

type ImageQuality = "low" | "medium" | "high";

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

function imageQuality(): ImageQuality {
  const style = process.env.STYLE_TRANSFER_QUALITY?.trim().toLowerCase();
  if (style === "low" || style === "medium" || style === "high") {
    return style;
  }
  return "low";
}

function parseFlag(argv: string[], name: string, fallback: string) {
  const index = argv.indexOf(`--${name}`);
  if (index >= 0 && argv[index + 1] && !argv[index + 1].startsWith("--")) {
    return argv[index + 1];
  }
  return fallback;
}

function guessImageMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  return "image/png";
}

function toImageDataUrl(buffer: Buffer, mime: string) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function main() {
  loadEnvFiles();
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const argv = process.argv.slice(2);
  const portraitPath = path.resolve(
    parseFlag(argv, "portrait", "./test-character.png"),
  );
  const stylePath = path.resolve(
    parseFlag(argv, "style", "./public/art-styles/watercolor_style.png"),
  );
  const quality = imageQuality();

  for (const [label, filePath] of [
    ["portrait", portraitPath],
    ["style", stylePath],
  ] as const) {
    if (!existsSync(filePath)) {
      throw new Error(`${label} not found: ${filePath}`);
    }
  }

  const [portraitBytes, styleBytes] = await Promise.all([
    readFile(portraitPath),
    readFile(stylePath),
  ]);
  await mkdir(OUTPUT_DIR, { recursive: true });

  const outPath = path.join(
    OUTPUT_DIR,
    `style-transfer-${quality}-${timestampForFilename()}.jpg`,
  );

  console.log(
    `model=${RESPONSES_MODEL} tool=${IMAGE_GEN_TOOL_MODEL} size=${IMAGE_GEN_SIZE} quality=${quality}`,
  );
  console.log(`portrait=${portraitPath}`);
  console.log(`style=${stylePath}`);
  console.log(`output=${outPath}`);
  console.log("");
  console.log("=== Prompt (styleCharacter) ===");
  console.log(STYLE_CHARACTER_PROMPT);
  console.log("===============================");

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 10 * 60 * 1000,
  });

  const startedAt = Date.now();
  const result = await openai.responses.create({
    model: RESPONSES_MODEL,
    tools: [
      {
        type: "image_generation",
        model: IMAGE_GEN_TOOL_MODEL,
        size: IMAGE_GEN_SIZE,
        quality,
        output_format: OUTPUT_FORMAT,
      },
    ],
    tool_choice: { type: "image_generation" },
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: STYLE_CHARACTER_PROMPT },
          {
            type: "input_image",
            image_url: toImageDataUrl(
              portraitBytes,
              guessImageMime(portraitPath),
            ),
            detail: "high",
          },
          {
            type: "input_image",
            image_url: toImageDataUrl(styleBytes, guessImageMime(stylePath)),
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
  if (!imageCall || imageCall.type !== "image_generation_call" || !imageCall.result) {
    throw new Error(
      `No image result (types=${JSON.stringify(result.output.map((item) => item.type))})`,
    );
  }

  await writeFile(outPath, Buffer.from(imageCall.result, "base64"));
  console.log(`elapsed=${(elapsedMs / 1000).toFixed(2)}s`);
  console.log(`Saved: ${outPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
