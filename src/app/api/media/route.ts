import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { userCanAccessMedia } from "@/lib/media-access";
import { isProtectedMediaSrc } from "@/lib/media-paths";
import { getWatermarkedPreview } from "@/lib/preview-watermark";
import { guessStoredAssetMime, readStoredAsset } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const url = new URL(request.url);
  const src = url.searchParams.get("src")?.trim() ?? "";
  const requestedOriginal = url.searchParams.get("v") === "original";
  const isAdmin = Boolean(session.user.isAdmin);

  if (!src || src.includes("..") || !isProtectedMediaSrc(src)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await userCanAccessMedia({
    userId: session.user.id,
    isAdmin,
    src,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const original = await readStoredAsset(src);
  if (!original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (requestedOriginal && isAdmin) {
    return new NextResponse(new Uint8Array(original), {
      headers: {
        "Content-Type": guessStoredAssetMime(src),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  }

  const preview = await getWatermarkedPreview(src, original);
  return new NextResponse(new Uint8Array(preview.bytes), {
    headers: {
      "Content-Type": preview.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
