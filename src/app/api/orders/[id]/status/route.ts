import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { enqueueIllustrationGenerations } from "@/lib/enqueue-illustration-generation";
import { illustrationStatusPayload } from "@/lib/generation-status";
import { illustrationQueueProgress } from "@/lib/gpt-image-progress";
import { shouldKickPendingIllustration } from "@/lib/illustration-generation-policy";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const order = await prisma.storybookOrder.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const illustrations = await prisma.illustration.findMany({
    where: { orderId: order.id },
    select: {
      id: true,
      pageNumber: true,
      status: true,
      imagePath: true,
      progressLabel: true,
      prompt: true,
      updatedAt: true,
    },
    orderBy: { pageNumber: "asc" },
  });

  const staleIds = illustrations
    .filter((page) => shouldKickPendingIllustration(page))
    .map((page) => page.id);

  if (staleIds.length > 0) {
    void enqueueIllustrationGenerations(staleIds);
  }

  const withQueue = await Promise.all(
    illustrations.map(async (item) => {
      const queue = await illustrationQueueProgress({
        illustrationId: item.id,
        orderId: order.id,
        status: item.status,
        progressLabel: item.progressLabel,
      });
      return {
        ...item,
        queueStatus: queue.queueStatus,
        queueAhead: queue.queueAhead,
        progressLabel: queue.label,
      };
    }),
  );

  return NextResponse.json(illustrationStatusPayload(withQueue));
}
