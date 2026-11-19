import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 단어 그림책 한 권의 웹 앱 manifest.
 * 태블릿에서 "홈 화면에 추가 / 앱 설치" 를 하면 이 책(/wordbook/주문ID)이 전체 화면으로 바로 열린다.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  let name = "단어 그림책";
  const session = await auth();
  if (session?.user?.id && params.id !== "demo") {
    const order = await prisma.wordbookOrder.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { character: { select: { label: true } } },
    });
    if (order?.character?.label) {
      name = `${order.character.label}의 단어 그림책`;
    }
  }

  const manifest = {
    id: `/wordbook/${params.id}`,
    name,
    short_name: "단어 그림책",
    description: "판바기 단어 놀이 그림책",
    start_url: `/wordbook/${params.id}`,
    scope: "/wordbook/",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#EAF4FB",
    theme_color: "#EAF4FB",
    lang: "ko",
    icons: [
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
