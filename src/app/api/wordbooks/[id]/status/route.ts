import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { expireStaleWordbookOrder, wordbookStatusPayload } from "@/lib/wordbook-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const order = await prisma.wordbookOrder.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: {
      id: true,
      userId: true,
      status: true,
      updatedAt: true,
      curiousImagePath: true,
      surprisedImagePath: true,
      paymentStatus: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "단어 그림책을 찾을 수 없습니다." }, { status: 404 });
  }

  const expired = await expireStaleWordbookOrder(order);
  return NextResponse.json(
    wordbookStatusPayload(expired ? { ...order, status: "FAILED" } : order),
  );
}
