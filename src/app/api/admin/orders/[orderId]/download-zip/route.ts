import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { contentDisposition, publicUrlToFsPath } from "@/lib/files";
import { zipFiles } from "@/lib/zip";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { orderId: string } },
) {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await prisma.storybookOrder.findUnique({
    where: { id: params.orderId },
    include: {
      illustrations: {
        orderBy: { pageNumber: "asc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const entries = order.illustrations.flatMap((illustration) => {
    const filepath = publicUrlToFsPath(illustration.imagePath);
    if (!filepath) {
      return [];
    }

    return [
      {
        filepath,
        name: `${illustration.pageNumber}_원본.png`,
      },
    ];
  });

  if (entries.length === 0) {
    return NextResponse.json({ error: "다운로드할 원본 이미지가 없습니다." }, { status: 404 });
  }

  const zip = await zipFiles(entries);

  return new NextResponse(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition(`${order.id}_원본.zip`),
    },
  });
}
