import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { contentDisposition } from "@/lib/files";
import { albumPageHasPhotos } from "@/lib/photo-album";
import { buildAlbumPrintZipEntries } from "@/lib/photo-album-print";
import { zipFiles } from "@/lib/zip";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

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
      photoAlbumPages: {
        orderBy: { pageNumber: "asc" },
        select: {
          pageNumber: true,
          photoPaths: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (order.photoAlbumPages.length === 0) {
    return NextResponse.json({ error: "사진첩 페이지가 없습니다." }, { status: 404 });
  }

  const hasAnyPhoto = order.photoAlbumPages.some((page) =>
    albumPageHasPhotos(page.photoPaths),
  );
  if (!hasAnyPhoto) {
    return NextResponse.json(
      { error: "사진첩에 넣은 사진이 없습니다." },
      { status: 404 },
    );
  }

  const printEntries = await buildAlbumPrintZipEntries(order.photoAlbumPages);
  const zip = await zipFiles(printEntries);

  return new NextResponse(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition(`${order.id}_사진첩인쇄.zip`),
    },
  });
}
