import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getWatermarkedPreview } from "@/lib/preview-watermark";
import {
  guessStoredAssetMime,
  readStoredAsset,
  sniffImageContentType,
} from "@/lib/uploads";

export async function serveStoredMedia(
  storedPath: string | null | undefined,
  options?: { forceOriginal?: boolean },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!storedPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const original = await readStoredAsset(storedPath);
  if (!original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = Boolean(session.user.isAdmin);
  const contentType = sniffImageContentType(original) || guessStoredAssetMime(storedPath);

  if (options?.forceOriginal && isAdmin) {
    return new NextResponse(new Uint8Array(original), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  }

  const preview = await getWatermarkedPreview(storedPath, original);
  return new NextResponse(new Uint8Array(preview.bytes), {
    headers: {
      "Content-Type": preview.contentType || contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}

export function wantsOriginal(request: Request) {
  return new URL(request.url).searchParams.get("v") === "original";
}
