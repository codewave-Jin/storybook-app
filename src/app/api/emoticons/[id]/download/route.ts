import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EMOTICON_CELLS, emoticonDownloadName } from "@/lib/emoticon-prompt";
import { contentDisposition } from "@/lib/files";
import { prisma } from "@/lib/prisma";
import { readStoredAsset } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const order = await prisma.emoticonOrder.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { paymentStatus: true, cellImagePaths: true },
  });
  if (!order) {
    return NextResponse.json({ error: "이모티콘을 찾을 수 없습니다." }, { status: 404 });
  }
  if (order.paymentStatus !== "PAID") {
    return NextResponse.json({ error: "결제 후 한 장씩 받을 수 있어요." }, { status: 402 });
  }
  if (order.cellImagePaths.length !== EMOTICON_CELLS.length) {
    return NextResponse.json({ error: "이모티콘 파일을 찾지 못했습니다." }, { status: 404 });
  }

  const rawIndex = new URL(request.url).searchParams.get("index");
  const index = rawIndex == null ? Number.NaN : Number(rawIndex);
  if (!/^\d+$/.test(rawIndex ?? "") || index < 0 || index >= order.cellImagePaths.length) {
    return NextResponse.json({ error: "받을 이모티콘을 골라 주세요." }, { status: 400 });
  }

  const file = await readStoredAsset(order.cellImagePaths[index]);
  if (!file) {
    return NextResponse.json({ error: "이모티콘 파일을 찾지 못했습니다." }, { status: 404 });
  }

  const filename = emoticonDownloadName(index, EMOTICON_CELLS[index]?.caption ?? "emoticon");
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": contentDisposition(filename),
      "Cache-Control": "private, no-store",
    },
  });
}
