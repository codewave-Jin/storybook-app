import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { unauthorizedIfInvalidInternalKey } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";
import { persistGeneratedIllustrationImage } from "@/lib/uploads";

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

function revalidateIllustration(orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/illustrations");
  revalidatePath(`/admin/illustrations/${orderId}`);
  revalidatePath("/admin/upscale");
  revalidatePath(`/admin/upscale/${orderId}`);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  console.log("[illustration complete] request received", {
    illustrationId: params.id,
    hasApiKey: Boolean(request.headers.get("x-api-key")),
  });

  const unauthorized = unauthorizedIfInvalidInternalKey(request);
  if (unauthorized) {
    console.log("[illustration complete] unauthorized", params.id);
    return unauthorized;
  }

  let body: CompleteBody;
  try {
    body = (await request.json()) as CompleteBody;
  } catch {
    console.log("[illustration complete] invalid JSON");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[illustration complete] body", {
    illustrationId: params.id,
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

  const illustration = await prisma.illustration.findUnique({
    where: { id: params.id },
    select: { id: true, orderId: true },
  });

  if (!illustration) {
    console.log("[illustration complete] not found", params.id);
    return NextResponse.json(
      { error: "Illustration not found" },
      { status: 404 },
    );
  }

  const errorMessage =
    asNonEmptyString(body.errorMessage) ?? asNonEmptyString(body.error_message);

  if (!body.success) {
    console.error(
      errorMessage
        ? `[illustration complete] ${params.id} failed: ${errorMessage}`
        : `[illustration complete] ${params.id} failed`,
    );

    await prisma.illustration.update({
      where: { id: params.id },
      data: { status: "FAILED" },
    });

    revalidateIllustration(illustration.orderId);
    return NextResponse.json({ ok: true, status: "FAILED" });
  }

  const sourcePath =
    asNonEmptyString(body.imagePath) ?? asNonEmptyString(body.image_path);

  if (!sourcePath) {
    return NextResponse.json(
      { error: "imagePath is required when success is true" },
      { status: 400 },
    );
  }

  let imagePath: string;
  try {
    imagePath = await persistGeneratedIllustrationImage(sourcePath);
  } catch (error) {
    console.error(
      `[illustration complete] ${params.id} could not store image`,
      error,
    );
    return NextResponse.json(
      { error: "Could not store generated image" },
      { status: 400 },
    );
  }

  const seed = asSeed(body.seed);

  await prisma.illustration.update({
    where: { id: params.id },
    data: {
      status: "COMPLETED",
      imagePath,
      ...(seed !== undefined ? { seed } : {}),
    },
  });

  revalidateIllustration(illustration.orderId);
  console.log("[illustration complete] saved status=COMPLETED", {
    illustrationId: params.id,
    imagePath,
    seed,
  });
  return NextResponse.json({ ok: true, status: "COMPLETED" });
}
