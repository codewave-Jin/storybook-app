import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import OpenAI from "openai";

export const RESPONSES_MODEL = "gpt-5.6" as const;
export const IMAGE_GEN_TOOL_MODEL = "gpt-image-2" as const;
export const IMAGE_GEN_SIZE = "1024x1024" as const;
export const IMAGE_GEN_QUALITY = "high" as const;

export type ImageGenerationQuality = "low" | "medium" | "high";

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
  style: IllustrationImageInput;
  quality?: ImageGenerationQuality;
}): Promise<GenerateIllustrationViaResponsesResult> {
  const quality = opts.quality ?? IMAGE_GEN_QUALITY;
  const openai = opts.openai ?? createIllustrationOpenAIClient();

  console.log(
    `[openai-illustration] responses.create model=${RESPONSES_MODEL} tool=${IMAGE_GEN_TOOL_MODEL} size=${IMAGE_GEN_SIZE} quality=${quality} characters=${opts.characters.length}`,
  );

  const startedAt = Date.now();
  const result = await openai.responses.create({
    model: RESPONSES_MODEL,
    tools: [
      {
        type: "image_generation",
        model: IMAGE_GEN_TOOL_MODEL,
        size: IMAGE_GEN_SIZE,
        quality,
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
          {
            type: "input_image",
            image_url: toImageDataUrl(opts.style.bytes, opts.style.mime),
            detail: "high" as const,
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
