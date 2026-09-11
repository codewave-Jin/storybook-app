import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { contentDisposition } from "@/lib/files";
import { loadOrderStoryPages } from "@/lib/order-story-text";
import { zipFiles } from "@/lib/zip";

export async function GET(
  _request: Request,
  { params }: { params: { orderId: string } },
) {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const story = await loadOrderStoryPages(params.orderId);
  if (!story) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const entries: Array<{
    storedPath?: string;
    content?: Buffer | string;
    name: string;
  }> = story.pages.flatMap((page) => {
    const artPath = page.sceneImagePath || page.imagePath;
    if (!artPath) {
      return [];
    }

    return [
      {
        storedPath: artPath,
        name: `${page.pageNumber}_삽화.png`,
      },
    ];
  });

  if (story.exportText) {
    entries.push({
      name: "본문글.txt",
      content: story.exportText,
    });
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: "다운로드할 삽화가 없습니다." }, { status: 404 });
  }

  const zip = await zipFiles(entries);

  return new NextResponse(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition(`${story.orderId}_삽화.zip`),
    },
  });
}
