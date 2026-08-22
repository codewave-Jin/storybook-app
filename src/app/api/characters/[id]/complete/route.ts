import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { persistGeneratedCharacterImage } from "@/lib/uploads";

type CompleteBody = {
  success?: unknown;
  imagePath?: unknown;
  image_path?: unknown;
  seed?: unknown;
  errorMessage?: unknown;
  error_message?: unknown;
};

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asSeed(value: unknown): bigint | undefined {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) {
    return BigInt(value);
  }

  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }

  return undefined;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  console.log("[character complete] request received", {
    characterId: params.id,
    method: request.method,
    url: request.url,
    hasApiKey: Boolean(request.headers.get("x-api-key")),
  });

  let body: CompleteBody;
  try {
    body = (await request.json()) as CompleteBody;
  } catch {
    console.log("[character complete] invalid JSON");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[character complete] body", {
    characterId: params.id,
    success: body.success,
    imagePath: body.imagePath ?? body.image_path,
    seed: body.seed,
    errorMessage: body.errorMessage ?? body.error_message,
  });

  if (typeof body.success !== "boolean") {
    return NextResponse.json(
      { error: "success must be a boolean" },
      { status: 400 },
    );
  }

  const character = await prisma.character.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!character) {
    console.log("[character complete] character not found", params.id);
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const errorMessage =
    asNonEmptyString(body.errorMessage) ?? asNonEmptyString(body.error_message);

  if (!body.success) {
    console.error(
      errorMessage
        ? `[character complete] ${params.id} failed: ${errorMessage}`
        : `[character complete] ${params.id} failed`,
    );

    await prisma.character.update({
      where: { id: params.id },
      data: { status: "FAILED", progressPercent: 0, progressLabel: null },
    });

    revalidatePath("/dashboard");
    console.log("[character complete] saved status=FAILED", params.id);
    return NextResponse.json({ ok: true, status: "FAILED" });
  }

  const sourcePath =
    asNonEmptyString(body.imagePath) ?? asNonEmptyString(body.image_path);

  if (!sourcePath) {
    console.log("[character complete] missing imagePath", params.id);
    return NextResponse.json(
      { error: "imagePath is required when success is true" },
      { status: 400 },
    );
  }

  let generatedImagePath: string;
  try {
    generatedImagePath = await persistGeneratedCharacterImage(sourcePath);
  } catch (error) {
    console.error(
      `[character complete] ${params.id} could not store image`,
      error,
    );
    return NextResponse.json(
      { error: "Could not store generated image" },
      { status: 400 },
    );
  }

  const seed = asSeed(body.seed);

  await prisma.character.update({
    where: { id: params.id },
    data: {
      status: "COMPLETED",
      generatedImagePath,
      progressPercent: 100,
      progressLabel: "완료",
      ...(seed !== undefined ? { seed } : {}),
    },
  });

  revalidatePath("/dashboard");
  console.log("[character complete] saved status=COMPLETED", {
    characterId: params.id,
    generatedImagePath,
    seed,
  });
  return NextResponse.json({ ok: true, status: "COMPLETED" });
}
