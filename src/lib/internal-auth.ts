import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export function unauthorizedIfInvalidInternalKey(request: Request) {
  const expected = process.env.INTERNAL_API_KEY;
  const provided = request.headers.get("x-api-key");

  if (!expected) {
    return null;
  }

  if (!provided) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "x-api-key header is missing; allowing request in development",
      );
      return null;
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
