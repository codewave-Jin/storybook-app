import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const afterRaw = new URL(request.url).searchParams.get("after");
  const after = afterRaw ? new Date(afterRaw) : null;
  if (!after || Number.isNaN(after.getTime())) {
    return NextResponse.json({ error: "확인할 시각이 없습니다." }, { status: 400 });
  }

  const order = await prisma.emoticonOrder.findFirst({
    where: {
      userId: session.user.id,
      createdAt: { gte: after },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return NextResponse.json({ orderId: order?.id ?? null });
}
