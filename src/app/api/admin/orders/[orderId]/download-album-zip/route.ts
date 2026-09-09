import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { contentDisposition } from "@/lib/files";
import { albumLayoutById, parseAlbumSlotPhotos } from "@/lib/photo-album";
import { zipFiles } from "@/lib/zip";
import { prisma } from "@/lib/prisma";

function fileExtension(path: string) {
  const match = path.match(/\.[a-zA-Z0-9]+(?:\?.*)?$/);
  if (!match) {
    return ".jpg";
  }
  return match[0].replace(/\?.*$/, "");
}

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
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const entries = order.photoAlbumPages.flatMap((page) => {
    const layout = albumLayoutById(page.layoutId);
    const photos = parseAlbumSlotPhotos(page.photoPaths);
    return layout.slots.flatMap((slot) => {
      const photo = photos[slot.id];
      if (!photo?.path) {
        return [];
      }
      const pageNo = String(page.pageNumber).padStart(2, "0");
      return [
        {
          storedPath: photo.path,
          name: `album/p${pageNo}-${slot.id}${fileExtension(photo.path)}`,
        },
      ];
    });
  });

  if (entries.length === 0) {
    return NextResponse.json({ error: "다운로드할 사진첩 이미지가 없습니다." }, { status: 404 });
  }

  const zip = await zipFiles(entries);

  return new NextResponse(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition(`${order.id}_사진첩.zip`),
    },
  });
}
