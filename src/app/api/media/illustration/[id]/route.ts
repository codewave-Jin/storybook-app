import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serveStoredMedia, wantsOriginal } from "@/lib/media-serve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const isAdmin = Boolean(session.user.isAdmin);
  const illustration = await prisma.illustration.findFirst({
    where: isAdmin
      ? { id: params.id }
      : { id: params.id, order: { userId: session.user.id } },
    select: { imagePath: true, sceneImagePath: true },
  });
  if (!illustration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return serveStoredMedia(
    illustration.sceneImagePath || illustration.imagePath,
    { forceOriginal: wantsOriginal(request) },
  );
}
