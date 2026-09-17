import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serveStoredMedia, wantsOriginal } from "@/lib/media-serve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string; kind: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const isAdmin = Boolean(session.user.isAdmin);
  const order = await prisma.stickerOrder.findFirst({
    where: isAdmin
      ? { id: params.id }
      : { id: params.id, userId: session.user.id },
    select: {
      previewImagePath: true,
      finalImagePath: true,
      compositeImagePath: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const storedPath =
    params.kind === "final"
      ? order.finalImagePath
      : params.kind === "composite"
        ? order.compositeImagePath
        : order.previewImagePath;

  return serveStoredMedia(storedPath, {
    forceOriginal: wantsOriginal(request),
  });
}
