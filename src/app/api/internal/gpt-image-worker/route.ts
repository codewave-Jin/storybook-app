import { NextResponse } from "next/server";
import { unauthorizedIfInvalidGptImageWorkerKey } from "@/lib/gpt-image-worker-auth";
import { runGptImageWorker } from "@/lib/gpt-image-worker";

export const maxDuration = 300;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handle(request: Request) {
  const unauthorized = unauthorizedIfInvalidGptImageWorkerKey(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await runGptImageWorker();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[gpt-image-worker] invocation failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "gpt image worker failed",
      },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
