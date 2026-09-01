import { revalidatePath } from "next/cache";
import { getFromComfy, isComfyMockEnabled } from "@/lib/comfy-server";
import { prisma } from "@/lib/prisma";
import {
  persistGeneratedCharacterBase64,
  persistGeneratedCharacterImage,
} from "@/lib/uploads";

type ComfyCharacterPayload = Record<string, unknown>;

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asSeed(value: unknown): bigint | undefined {
  if (typeof value === "bigint") {
    return value;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value)
  ) {
    return BigInt(value);
  }

  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }

  return undefined;
}

export type ParsedComfyCharacterResult =
  | { kind: "processing" }
  | { kind: "failed"; errorMessage?: string }
  | {
      kind: "success";
      imagePath?: string;
      imageBase64?: string;
      seed?: bigint;
    }
  | null;

export function parseComfyCharacterPayload(
  data: ComfyCharacterPayload,
): ParsedComfyCharacterResult {
  const status = asNonEmptyString(data.status)?.toLowerCase();
  const state = asNonEmptyString(data.state)?.toLowerCase();

  const failed =
    data.success === false ||
    status === "failed" ||
    status === "error" ||
    state === "failed" ||
    state === "error";

  if (failed) {
    return {
      kind: "failed",
      errorMessage:
        asNonEmptyString(data.errorMessage) ??
        asNonEmptyString(data.error_message) ??
        asNonEmptyString(data.error),
    };
  }

  const completed =
    data.success === true ||
    status === "completed" ||
    status === "complete" ||
    status === "done" ||
    state === "completed" ||
    state === "complete" ||
    state === "done" ||
    state === "success";

  if (!completed) {
    const processing =
      status === "processing" ||
      status === "pending" ||
      status === "running" ||
      state === "processing" ||
      state === "pending" ||
      state === "running" ||
      state === "queued";

    if (processing) {
      return { kind: "processing" };
    }

    return null;
  }

  const imagePath =
    asNonEmptyString(data.imagePath) ??
    asNonEmptyString(data.image_path) ??
    asNonEmptyString(data.outputPath) ??
    asNonEmptyString(data.output_path) ??
    asNonEmptyString(data.path) ??
    asNonEmptyString(data.url);

  const imageBase64 =
    asNonEmptyString(data.imageBase64) ??
    asNonEmptyString(data.image_base64) ??
    asNonEmptyString(data.b64_json) ??
    asNonEmptyString(data.b64);

  if (!imagePath && !imageBase64) {
    return null;
  }

  const seed = asSeed(data.seed);

  return {
    kind: "success",
    imagePath,
    imageBase64,
    seed,
  };
}

export async function applyCharacterGenerationResult(
  characterId: string,
  parsed: Exclude<ParsedComfyCharacterResult, null | { kind: "processing" }>,
) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, status: true },
  });

  if (!character) {
    return { ok: false as const, error: "Character not found" };
  }

  if (character.status === "COMPLETED" || character.status === "FAILED") {
    return { ok: true as const, status: character.status, skipped: true };
  }

  if (parsed.kind === "failed") {
    await prisma.character.update({
      where: { id: characterId },
      data: { status: "FAILED", progressPercent: 0, progressLabel: null },
    });
    revalidatePath("/dashboard");
    return { ok: true as const, status: "FAILED" };
  }

  let generatedImagePath: string;
  try {
    if (parsed.imageBase64) {
      generatedImagePath = await persistGeneratedCharacterBase64(
        parsed.imageBase64,
      );
    } else if (parsed.imagePath) {
      generatedImagePath = await persistGeneratedCharacterImage(
        parsed.imagePath,
      );
    } else {
      return {
        ok: false as const,
        error: "imagePath or imageBase64 is required when success is true",
      };
    }
  } catch (error) {
    console.error(
      `[character generation] ${characterId} could not store image`,
      error,
    );
    await prisma.character.update({
      where: { id: characterId },
      data: {
        status: "FAILED",
        progressPercent: 0,
        progressLabel: null,
      },
    });
    revalidatePath("/dashboard");
    return { ok: false as const, error: "Could not store generated image" };
  }

  await prisma.character.update({
    where: { id: characterId },
    data: {
      status: "COMPLETED",
      generatedImagePath,
      progressPercent: 100,
      progressLabel: "완료",
      ...(parsed.seed !== undefined ? { seed: parsed.seed } : {}),
    },
  });

  revalidatePath("/dashboard");
  return { ok: true as const, status: "COMPLETED", generatedImagePath };
}

const COMFY_CHARACTER_STATUS_PATHS = [
  "/character-status/{id}",
  "/generate-character/status/{id}",
  "/characters/{id}/status",
  "/characters/{id}",
];

export async function trySyncCharacterFromComfy(characterId: string) {
  if (isComfyMockEnabled()) {
    return false;
  }

  for (const pattern of COMFY_CHARACTER_STATUS_PATHS) {
    const pathname = pattern.replace("{id}", encodeURIComponent(characterId));

    try {
      const response = await getFromComfy(pathname);
      if (!response.ok) {
        continue;
      }

      const data = (await response.json().catch(() => null)) as
        | ComfyCharacterPayload
        | null;
      if (!data) {
        continue;
      }

      const parsed = parseComfyCharacterPayload(data);
      if (!parsed || parsed.kind === "processing") {
        continue;
      }

      const result = await applyCharacterGenerationResult(characterId, parsed);
      if (result.ok) {
        console.log("[character sync] synced from comfy", {
          characterId,
          pathname,
          status: result.status,
        });
        return true;
      }
    } catch (error) {
      console.warn("[character sync] comfy poll failed", pathname, error);
    }
  }

  return false;
}
