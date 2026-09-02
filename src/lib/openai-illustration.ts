import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import OpenAI from "openai";
import {
  ILLUSTRATION_OUTPUT_FORMAT,
  IMAGE_GEN_SIZE,
  IMAGE_QUALITY,
  type ImageGenerationQuality,
  type ImageOutputFormat,
} from "@/lib/image-generation-config";
import { toOpenAIRateLimitError } from "@/lib/openai-rate-limit";

export const RESPONSES_MODEL = "gpt-5.6" as const;
export const IMAGE_GEN_TOOL_MODEL = "gpt-image-2" as const;
export {
  IMAGE_GEN_SIZE,
  IMAGE_QUALITY,
  IMAGE_GEN_QUALITY,
  type ImageGenerationQuality,
} from "@/lib/image-generation-config";

export type IllustrationImageInput = {
  bytes: Buffer;
  mime: string;
  name: string;
};

export type GenerateIllustrationViaResponsesResult = {
  b64: string;
  elapsedMs: number;
  usage?: OpenAI.Responses.Response["usage"];
  revisedPrompt?: string | null;
};

export function createIllustrationOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 10 * 60 * 1000,
  });
}

export function guessImageMime(filePath: string): string {
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

export function toImageDataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function loadImageAsset(
  pathOrUrl: string,
): Promise<IllustrationImageInput> {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    const response = await fetch(pathOrUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image (${response.status}): ${pathOrUrl}`,
      );
    }
    const contentType = response.headers.get("content-type") ?? "image/png";
    const mime = contentType.split(";")[0]?.trim() || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const urlPath = new URL(pathOrUrl).pathname;
    const name = path.basename(decodeURIComponent(urlPath)) || "image.png";
    return { bytes: Buffer.from(arrayBuffer), mime, name };
  }

  const candidates = [
    pathOrUrl,
    path.resolve(pathOrUrl),
    path.isAbsolute(pathOrUrl)
      ? pathOrUrl
      : path.resolve(process.cwd(), pathOrUrl),
  ];

  if (pathOrUrl.startsWith("/")) {
    candidates.push(
      path.join(
        process.cwd(),
        "public",
        ...pathOrUrl.split("/").filter(Boolean),
      ),
    );
  }

  const found = candidates.find(
    (candidate) => existsSync(candidate),
  );
  if (!found) {
    throw new Error(`Image not found: ${pathOrUrl}`);
  }

  const bytes = await readFile(found);
  return {
    bytes,
    mime: guessImageMime(found),
    name: path.basename(found),
  };
}

export async function generateIllustrationViaResponsesAPI(opts: {
  openai?: OpenAI;
  prompt: string;
  characters: IllustrationImageInput[];
  style?: IllustrationImageInput;
  quality?: ImageGenerationQuality;
  outputFormat?: ImageOutputFormat;
}): Promise<GenerateIllustrationViaResponsesResult> {
  const quality = opts.quality ?? IMAGE_QUALITY;
  const outputFormat = opts.outputFormat ?? ILLUSTRATION_OUTPUT_FORMAT;
  const openai = opts.openai ?? createIllustrationOpenAIClient();

  console.log(
    `[openai-illustration] responses.create model=${RESPONSES_MODEL} tool=${IMAGE_GEN_TOOL_MODEL} size=${IMAGE_GEN_SIZE} quality=${quality} output_format=${outputFormat} characters=${opts.characters.length} style=${opts.style ? 1 : 0}`,
  );

  const startedAt = Date.now();
  let result;
  try {
    result = await openai.responses.create({
    model: RESPONSES_MODEL,
    tools: [
      {
        type: "image_generation",
        model: IMAGE_GEN_TOOL_MODEL,
        size: IMAGE_GEN_SIZE,
        quality,
        output_format: outputFormat,
      },
    ],
    tool_choice: { type: "image_generation" },
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: opts.prompt },
          ...opts.characters.map((character) => ({
            type: "input_image" as const,
            image_url: toImageDataUrl(character.bytes, character.mime),
            detail: "high" as const,
          })),
          ...(opts.style
            ? [
                {
                  type: "input_image" as const,
                  image_url: toImageDataUrl(opts.style.bytes, opts.style.mime),
                  detail: "high" as const,
                },
              ]
            : []),
        ],
      },
    ],
    });
  } catch (error) {
    const rateLimit = toOpenAIRateLimitError(error);
    if (rateLimit) {
      throw rateLimit;
    }
    throw error;
  }
  if (!result) {
    throw new Error("OpenAI returned no response");
  }
  const elapsedMs = Date.now() - startedAt;

  const imageCall = result.output.find(
    (item) => item.type === "image_generation_call",
  );
  if (!imageCall || imageCall.type !== "image_generation_call") {
    throw new Error(
      `No image_generation_call in response: ${JSON.stringify(result.output.map((item) => item.type))}`,
    );
  }

  const revisedPrompt =
    "revised_prompt" in imageCall && typeof imageCall.revised_prompt === "string"
      ? imageCall.revised_prompt
      : null;

  const b64 = imageCall.result;
  if (!b64) {
    throw new Error(
      `image_generation_call has no result (status=${imageCall.status})`,
    );
  }

  return { b64, elapsedMs, usage: result.usage, revisedPrompt };
}
