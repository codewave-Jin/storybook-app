import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  extensionForOutputFormat,
  ILLUSTRATION_OUTPUT_FORMAT,
  IMAGE_GEN_SIZE,
  IMAGE_QUALITY,
  mimeForOutputFormat,
} from "@/lib/image-generation-config";
import { toOpenAIRateLimitError } from "@/lib/openai-rate-limit";

export const CHARACTER_ASSET_BUCKET = "character-assets";

const RESPONSES_MODEL = "gpt-5.6" as const;
const IMAGE_GEN_TOOL_MODEL = "gpt-image-2" as const;

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

type ImageInput = {
  bytes: Buffer;
  mime: string;
};

export type StyleCharacterResult = {
  success?: boolean;
  styledImageUrl?: string;
  error?: string;
};

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

function errorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logStyleError(characterAssetId: string, error: unknown) {
  const status = errorStatus(error);
  const rateLimited = status === 429 ? " 429" : "";
  console.error(
    `[styleCharacter] asset=${characterAssetId} failed${rateLimited}: ${errorMessage(error)}`,
  );
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
}

async function loadImage(pathOrUrl: string): Promise<ImageInput> {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    const response = await fetch(pathOrUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image (${response.status}): ${pathOrUrl}`);
    }
    const contentType = response.headers.get("content-type") ?? "image/png";
    const mime = contentType.split(";")[0]?.trim() || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    return { bytes: Buffer.from(arrayBuffer), mime };
  }

  const candidates = [
    pathOrUrl,
    path.resolve(pathOrUrl),
    path.resolve(process.cwd(), pathOrUrl),
  ];
  if (pathOrUrl.startsWith("/")) {
    candidates.push(
      path.join(process.cwd(), "public", ...pathOrUrl.split("/").filter(Boolean)),
    );
  }

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Image not found: ${pathOrUrl}`);
  }

  return {
    bytes: await readFile(found),
    mime: guessImageMime(found),
  };
}

async function generateStyledPortrait(opts: {
  openai: OpenAI;
  portrait: ImageInput;
  style: ImageInput;
}): Promise<string> {
  console.log(
    `[styleCharacter] responses.create model=${RESPONSES_MODEL} tool=${IMAGE_GEN_TOOL_MODEL} size=${IMAGE_GEN_SIZE} quality=${IMAGE_QUALITY} output_format=${ILLUSTRATION_OUTPUT_FORMAT}`,
  );

  let result;
  try {
    result = await opts.openai.responses.create({
    model: RESPONSES_MODEL,
    tools: [
      {
        type: "image_generation",
        model: IMAGE_GEN_TOOL_MODEL,
        size: IMAGE_GEN_SIZE,
        quality: IMAGE_QUALITY,
        output_format: ILLUSTRATION_OUTPUT_FORMAT,
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
            image_url: toImageDataUrl(opts.portrait.bytes, opts.portrait.mime),
            detail: "high",
          },
          {
            type: "input_image",
            image_url: toImageDataUrl(opts.style.bytes, opts.style.mime),
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
  if (!result) {
    throw new Error("OpenAI returned no response");
  }

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

  return b64;
}

async function uploadStyledImage(opts: {
  userId: string;
  characterId: string;
  characterAssetId: string;
  bytes: Buffer;
}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const ext = extensionForOutputFormat(ILLUSTRATION_OUTPUT_FORMAT);
  const objectPath = `${opts.userId}/${opts.characterId}/${opts.characterAssetId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(CHARACTER_ASSET_BUCKET)
    .upload(objectPath, opts.bytes, {
      contentType: mimeForOutputFormat(ILLUSTRATION_OUTPUT_FORMAT),
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data } = supabase.storage
    .from(CHARACTER_ASSET_BUCKET)
    .getPublicUrl(objectPath);
  return data.publicUrl;
}

async function markFailed(characterAssetId: string) {
  await prisma.characterAsset.update({
    where: { id: characterAssetId },
    data: {
      status: "FAILED",
      retryCount: { increment: 1 },
    },
  });
}

export async function styleCharacter(
  characterAssetId: string,
): Promise<StyleCharacterResult> {
  const asset = await prisma.characterAsset.findUnique({
    where: { id: characterAssetId },
    include: {
      character: true,
      artStyle: true,
    },
  });

  if (!asset) {
    return { error: `CharacterAsset not found: ${characterAssetId}` };
  }

  if (!asset.rawPortraitUrl) {
    return { error: `CharacterAsset ${characterAssetId} has no rawPortraitUrl` };
  }

  const referenceImageUrl = asset.artStyle.referenceImageUrl?.trim() || "";
  if (!referenceImageUrl) {
    return {
      error: `ArtStyle "${asset.artStyle.key}" has no referenceImageUrl`,
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY is not set" };
  }

  await prisma.characterAsset.update({
    where: { id: characterAssetId },
    data: { status: "STYLING" },
  });

  try {
    const [portrait, style] = await Promise.all([
      loadImage(asset.rawPortraitUrl),
      loadImage(referenceImageUrl),
    ]);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10 * 60 * 1000,
    });

    const b64 = await generateStyledPortrait({ openai, portrait, style });
    const styledImageUrl = await uploadStyledImage({
      userId: asset.character.userId,
      characterId: asset.characterId,
      characterAssetId,
      bytes: Buffer.from(b64, "base64"),
    });

    await prisma.characterAsset.update({
      where: { id: characterAssetId },
      data: {
        styledImageUrl,
        status: "READY",
      },
    });

    return { success: true, styledImageUrl };
  } catch (error) {
    logStyleError(characterAssetId, error);
    const rateLimit = toOpenAIRateLimitError(error);
    if (rateLimit) {
      await prisma.characterAsset.update({
        where: { id: characterAssetId },
        data: { status: "PENDING" },
      });
      throw rateLimit;
    }
    await markFailed(characterAssetId);
    return { error: errorMessage(error) };
  }
}
