import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { contentDisposition, publicUrlToFsPath } from "@/lib/files";
import { zipFiles } from "@/lib/zip";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } },
) {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { ids?: string[] }
    | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "선택된 항목이 없습니다." }, { status: 400 });
  }

  const illustrations = await prisma.illustration.findMany({
    where: {
      id: { in: ids },
      orderId: params.orderId,
      upscaledImagePath: { not: null },
    },
    orderBy: { pageNumber: "asc" },
  });

  const entries = illustrations.flatMap((illustration) => {
    const filepath = publicUrlToFsPath(illustration.upscaledImagePath);
    if (!filepath) {
      return [];
    }

    return [
      {
        filepath,
        name: `${illustration.pageNumber}_업스케일.png`,
      },
    ];
  });

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "다운로드할 업스케일 이미지가 없습니다." },
      { status: 404 },
    );
  }

  const zip = await zipFiles(entries);

  return new NextResponse(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition(`${params.orderId}_업스케일.zip`),
    },
  });
}
