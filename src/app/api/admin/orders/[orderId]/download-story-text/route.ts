import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { contentDisposition } from "@/lib/files";
import { loadOrderStoryPages } from "@/lib/order-story-text";

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

  if (!story.exportText) {
    return NextResponse.json({ error: "받을 본문 글이 없습니다." }, { status: 404 });
  }

  return new NextResponse(story.exportText, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": contentDisposition(`${story.orderId}_본문글.txt`),
    },
  });
}
