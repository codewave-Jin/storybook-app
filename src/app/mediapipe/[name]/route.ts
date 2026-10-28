import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WASM_FILES = new Set([
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
]);

export async function GET(
  _request: Request,
  { params }: { params: { name: string } },
) {
  const name = params.name;
  if (!WASM_FILES.has(name) || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(
    process.cwd(),
    "node_modules",
    "@mediapipe",
    "tasks-vision",
    "wasm",
    name,
  );
  const bytes = await readFile(filePath);
  const contentType = name.endsWith(".wasm")
    ? "application/wasm"
    : "text/javascript; charset=utf-8";

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
