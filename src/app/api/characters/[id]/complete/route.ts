import { NextResponse } from "next/server";
import {
  applyCharacterGenerationResult,
  parseComfyCharacterPayload,
} from "@/lib/character-generation";

type CompleteBody = {
  success?: unknown;
  imagePath?: unknown;
  image_path?: unknown;
  imageBase64?: unknown;
  image_base64?: unknown;
  b64_json?: unknown;
  b64?: unknown;
  seed?: unknown;
  errorMessage?: unknown;
  error_message?: unknown;
  status?: unknown;
  state?: unknown;
  outputPath?: unknown;
  output_path?: unknown;
  path?: unknown;
  url?: unknown;
  error?: unknown;
};

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
    status: body.status,
    state: body.state,
    imagePath: body.imagePath ?? body.image_path ?? body.output_path,
    hasBase64: Boolean(
      body.imageBase64 ?? body.image_base64 ?? body.b64_json ?? body.b64,
    ),
    seed: body.seed,
    errorMessage: body.errorMessage ?? body.error_message ?? body.error,
  });

  const parsed = parseComfyCharacterPayload(body as Record<string, unknown>);

  if (!parsed) {
    if (typeof body.success !== "boolean") {
      return NextResponse.json(
        { error: "success must be a boolean when status is not provided" },
        { status: 400 },
      );
    }

    const fallback = parseComfyCharacterPayload({
      ...body,
      success: body.success,
      status: body.success ? "completed" : "failed",
    });

    if (!fallback || fallback.kind === "processing") {
      return NextResponse.json(
        { error: "Could not parse character completion payload" },
        { status: 400 },
      );
    }

    const result = await applyCharacterGenerationResult(params.id, fallback);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Completion failed" },
        { status: result.error === "Character not found" ? 404 : 400 },
      );
    }
    console.log("[character complete] saved", {
      characterId: params.id,
      status: result.status,
      skipped: result.skipped,
    });
    return NextResponse.json({ ok: true, status: result.status });
  }

  if (parsed.kind === "processing") {
    return NextResponse.json({ ok: true, status: "PROCESSING" });
  }

  const result = await applyCharacterGenerationResult(params.id, parsed);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Completion failed" },
      { status: result.error === "Character not found" ? 404 : 400 },
    );
  }

  console.log("[character complete] saved", {
    characterId: params.id,
    status: result.status,
    skipped: result.skipped,
    generatedImagePath: result.generatedImagePath,
  });
  return NextResponse.json({ ok: true, status: result.status });
}
