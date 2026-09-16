/**
 * GPT call copied from scripts/test-sticker.ts generateStickerImage.
 * One input image (pre-composited border + character) + costume/phrase prompt.
 */
import OpenAI from "openai";
import {
  createIllustrationOpenAIClient,
  IMAGE_GEN_SIZE,
  IMAGE_GEN_TOOL_MODEL,
  IMAGE_QUALITY,
  RESPONSES_MODEL,
  toImageDataUrl,
} from "@/lib/openai-illustration";
import {
  STICKER_OUTPUT_FORMAT,
  type ImageGenerationQuality,
  type ImageOutputFormat,
} from "@/lib/image-generation-config";
import { toOpenAIRateLimitError } from "@/lib/openai-rate-limit";

type ResponsesUsage = NonNullable<OpenAI.Responses.Response["usage"]>;
type ImageGenerationBackground = "transparent" | "opaque" | "auto";

export async function generateStickerImage(opts: {
  openai?: OpenAI;
  prompt: string;
  imageBytes: Buffer;
  imageMime: string;
  outputFormat?: ImageOutputFormat;
  quality?: ImageGenerationQuality;
  model?: string;
  background?: ImageGenerationBackground;
}): Promise<{ b64: string; elapsedMs: number; usage?: ResponsesUsage }> {
  const openai = opts.openai ?? createIllustrationOpenAIClient();
  const quality = opts.quality ?? IMAGE_QUALITY;
  const outputFormat = opts.outputFormat ?? STICKER_OUTPUT_FORMAT;
  const startedAt = Date.now();

  let result;
  try {
    result = await openai.responses.create({
      model: RESPONSES_MODEL,
      tools: [
        {
          type: "image_generation",
          model: opts.model ?? IMAGE_GEN_TOOL_MODEL,
          size: IMAGE_GEN_SIZE,
          quality,
          output_format: outputFormat,
          ...(opts.background ? { background: opts.background } : {}),
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
  } catch (error) {
    const rateLimit = toOpenAIRateLimitError(error);
    if (rateLimit) {
      throw rateLimit;
    }
    throw error;
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

  const b64 = imageCall.result;
  if (!b64) {
    throw new Error(
      `image_generation_call has no result (status=${imageCall.status})`,
    );
  }

  return { b64, elapsedMs, usage: result.usage };
}
