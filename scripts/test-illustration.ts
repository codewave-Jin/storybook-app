/**
 * Standalone GPT illustration smoke test (not wired to order flow).
 *
 * Default path uses the Responses API image_generation tool so a mainline
 * model can rewrite the prompt before gpt-image-2 generates the image.
 * Pass --api images to compare against the older images.edit path.
 *
 * Usage:
 *   npx tsx scripts/test-illustration.ts --page 1 --style watercolor --character ./test-character.png
 *   npx tsx scripts/test-illustration.ts --style watercolor --character ./test-character.png --character ./test-character-2.png --scene "두 아이가 공원에서 공을 주고받으며 신나게 놀고 있다"
 */
import { readFileSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import OpenAI, { toFile } from "openai";
import {
  TEST_ILLUSTRATION_VARIABLES,
  buildIllustrationEditPrompt,
  substitutePromptTemplate,
} from "../src/lib/illustration-prompt";
import {
  IMAGE_GEN_QUALITY,
  IMAGE_GEN_TOOL_MODEL,
  RESPONSES_MODEL,
  generateIllustrationViaResponsesAPI,
  loadImageAsset,
} from "../src/lib/openai-illustration";

const FOREST_TEMPLATE_TITLE = "숲속 친구들과의 하루";
const IMAGE_EDIT_MODEL = "gpt-image-1.5" as const;
const INPUT_FIDELITY = "high" as const;
const DEFAULT_IMAGE_QUALITY = IMAGE_GEN_QUALITY;

/** gpt-image-1.5 token rates (USD per 1M tokens). */
const GPT_IMAGE_1_5_RATES = {
  textInput: 5,
  imageInput: 8,
  textOutput: 10,
  imageOutput: 32,
} as const;

/** gpt-5.6-sol short-context rates (USD per 1M tokens). */
const GPT_5_6_RATES = {
  input: 4,
  cachedInput: 0.4,
  output: 20,
} as const;

type ImageEditUsage = NonNullable<OpenAI.ImagesResponse["usage"]>;
type ResponsesUsage = NonNullable<OpenAI.Responses.Response["usage"]>;
type ApiMode = "responses" | "images";
type ImageQuality = "low" | "medium" | "high";

type GenerateResult = {
  b64: string;
  elapsedMs: number;
  usage?: ImageEditUsage | ResponsesUsage;
  revisedPrompt?: string | null;
};

type CliArgs = {
  page?: number;
  scene?: string;
  style: string;
  characters: string[];
  out?: string;
  templateTitle?: string;
  api: ApiMode;
  quality: ImageQuality;
};

type LocalImage = {
  path: string;
  bytes: Buffer;
  mime: string;
  name: string;
};

function printUsage(): never {
  console.error(`Usage:
  npx tsx scripts/test-illustration.ts --page <n> --style <artStyleKey> --character <localImagePath> [--out <pngPath>] [--template <title>] [--api responses|images] [--quality low|medium|high]
  npx tsx scripts/test-illustration.ts --style <artStyleKey> --character <path> --character <path> [--character <path>] --scene "<scene text>" [--quality low|medium|high]

Example:
  npx tsx scripts/test-illustration.ts --page 1 --style watercolor --character ./test-character.png
  npx tsx scripts/test-illustration.ts --style watercolor --character ./test-character.png --character ./test-character-2.png --scene "두 아이가 공원 잔디밭에서 손을 잡고 함께 뛰어놀고 있다"
  npx tsx scripts/test-illustration.ts --page 1 --style watercolor --character ./test-character.png --quality low
  npx tsx scripts/test-illustration.ts --page 1 --style watercolor --character ./test-character.png --api images
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

  if (!args.style?.trim()) {
    console.error("--style is required (ArtStyle.key)");
    printUsage();
  }
  if (characters.length < 1) {
    console.error("--character is required (local image path, repeatable up to 3)");
    printUsage();
  }
  if (characters.length > 3) {
    console.error("--character can be passed at most 3 times");
    printUsage();
  }

  const scene = args.scene?.trim();
  let page: number | undefined;
  if (!scene) {
    page = Number(args.page);
    if (!Number.isInteger(page) || page < 1) {
      console.error("--page is required unless --scene is provided");
      printUsage();
    }
  }

  const apiRaw = args.api?.trim() || "responses";
  if (apiRaw !== "responses" && apiRaw !== "images") {
    console.error('--api must be "responses" or "images"');
    printUsage();
  }

  const qualityRaw = args.quality?.trim() || DEFAULT_IMAGE_QUALITY;
  if (qualityRaw !== "low" && qualityRaw !== "medium" && qualityRaw !== "high") {
    console.error('--quality must be "low", "medium", or "high"');
    printUsage();
  }

  return {
    page,
    scene,
    style: args.style.trim(),
    characters: characters.map((item) => item.trim()).filter(Boolean),
    out: args.out?.trim(),
    templateTitle: args.template?.trim() || FOREST_TEMPLATE_TITLE,
    api: apiRaw,
    quality: qualityRaw,
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

function formatUsd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

function logImagesApiUsage(usage: ImageEditUsage | undefined, elapsedMs: number) {
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
  console.log(`estimated mainline cost=${formatUsd(mainlineUsd)}`);
  console.log(
    `image tool (${IMAGE_GEN_TOOL_MODEL}): token usage is not itemized in response.usage; billed separately at gpt-image-2 rates`,
  );
}

async function generateViaImagesAPI(opts: {
  openai: OpenAI;
  prompt: string;
  characters: LocalImage[];
  styleBytes: Buffer;
  styleName: string;
  styleMime: string;
  quality?: ImageQuality;
}): Promise<GenerateResult> {
  const quality = opts.quality ?? DEFAULT_IMAGE_QUALITY;
  const characterFiles = await Promise.all(
    opts.characters.map((character) =>
      toFile(character.bytes, character.name, { type: character.mime }),
    ),
  );
  const styleFile = await toFile(opts.styleBytes, opts.styleName, {
    type: opts.styleMime,
  });

  console.log(
    `Calling OpenAI images.edit (model=${IMAGE_EDIT_MODEL}, input_fidelity=${INPUT_FIDELITY}, quality=${quality}, characters=${opts.characters.length})...`,
  );
  const startedAt = Date.now();
  const result = await opts.openai.images.edit({
    model: IMAGE_EDIT_MODEL,
    image: [...characterFiles, styleFile],
    prompt: opts.prompt,
    input_fidelity: INPUT_FIDELITY,
    quality,
  });
  const elapsedMs = Date.now() - startedAt;
  logImagesApiUsage(result.usage, elapsedMs);

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(
      `No b64_json in response: ${JSON.stringify(result).slice(0, 500)}`,
    );
  }

  return { b64, elapsedMs, usage: result.usage };
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
    const artStyle = await prisma.artStyle.findUnique({
      where: { key: cli.style },
    });
    if (!artStyle) {
      throw new Error(`ArtStyle not found for key="${cli.style}"`);
    }
    if (!artStyle.referenceImageUrl) {
      throw new Error(
        `ArtStyle "${cli.style}" has no referenceImageUrl. Update seed/DB first.`,
      );
    }

    let sceneDescription: string;
    let templateLog: string | undefined;
    if (cli.scene) {
      sceneDescription = cli.scene;
    } else {
      if (cli.page == null) {
        throw new Error("--page is required unless --scene is provided");
      }
      const pageTemplate = await prisma.pageTemplate.findFirst({
        where: {
          pageNumber: cli.page,
          storybookTemplate: { title: cli.templateTitle },
        },
        include: {
          storybookTemplate: { select: { id: true, title: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!pageTemplate) {
        throw new Error(
          `PageTemplate not found: title="${cli.templateTitle}", pageNumber=${cli.page}`,
        );
      }

      sceneDescription = substitutePromptTemplate(
        pageTemplate.promptTemplate,
        TEST_ILLUSTRATION_VARIABLES,
      );
      templateLog = `template="${pageTemplate.storybookTemplate.title}" page=${pageTemplate.pageNumber} type=${pageTemplate.pageType}`;
    }

    const prompt = buildIllustrationEditPrompt({
      sceneDescription,
      characterCount: cli.characters.length,
    });

    console.log("=== Final prompt ===");
    console.log(prompt);
    console.log("====================");
    console.log(`api=${cli.api} quality=${cli.quality} characters=${cli.characters.length}`);
    if (templateLog) {
      console.log(templateLog);
    }
    if (cli.scene) {
      console.log(`scene=${cli.scene}`);
    }
    console.log(
      `style=${artStyle.key} (${artStyle.label}) ref=${artStyle.referenceImageUrl}`,
    );
    for (const [index, characterPath] of cli.characters.entries()) {
      console.log(`character ${index + 1}=${path.resolve(characterPath)}`);
    }

    const characters: LocalImage[] = [];
    for (const characterPathArg of cli.characters) {
      const characterPath = path.resolve(characterPathArg);
      const image = await loadImageAsset(characterPath);
      characters.push({
        path: characterPath,
        bytes: image.bytes,
        mime: image.mime,
        name: image.name,
      });
    }
    const styleImage = await loadImageAsset(artStyle.referenceImageUrl);

    const generated =
      cli.api === "images"
        ? await generateViaImagesAPI({
            openai,
            prompt,
            characters,
            styleBytes: styleImage.bytes,
            styleName: styleImage.name,
            styleMime: styleImage.mime,
            quality: cli.quality,
          })
        : await generateIllustrationViaResponsesAPI({
            openai,
            prompt,
            characters,
            style: styleImage,
            quality: cli.quality,
          });

    if (cli.api === "responses") {
      logResponsesApiUsage(generated.usage as ResponsesUsage | undefined, generated.elapsedMs);
      console.log("=== Revised prompt ===");
      console.log(
        "revisedPrompt" in generated ? generated.revisedPrompt ?? "(not returned)" : "(not returned)",
      );
      console.log("======================");
    }

    const outDir = path.join(process.cwd(), "scripts", "output");
    await mkdir(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const characterSuffix =
      cli.characters.length > 1 ? `-c${cli.characters.length}` : "";
    const pageOrScene = cli.scene ? "scene" : `p${cli.page}`;
    const defaultName = `illustration-${cli.api}-${pageOrScene}-${cli.style}-${cli.quality}${characterSuffix}-${stamp}.png`;
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
