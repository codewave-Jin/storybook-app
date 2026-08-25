import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { IntervalRefresher } from "@/components/IntervalRefresher";
import { OrderPreviewBook } from "@/components/OrderPreviewBook";
import { illustrationStatusPayload } from "@/lib/generation-status";
import { prisma } from "@/lib/prisma";
import { startOrderPreviewGeneration } from "@/lib/preview-generation";
import {
  buildPreviewBookPages,
  previewIllustrationWhere,
} from "@/lib/preview-pages";

export default async function OrderPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/dashboard/orders/${params.id}/preview`);
  }

  let order = await prisma.storybookOrder.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      template: true,
      illustrations: {
        where: previewIllustrationWhere,
        orderBy: { pageNumber: "asc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  if (order.paymentStatus === "PENDING" && order.illustrations.length === 0) {
    await startOrderPreviewGeneration(order.id);
    const refreshed = await prisma.storybookOrder.findFirst({
      where: { id: order.id, userId: session.user.id },
      include: {
        template: true,
        illustrations: {
          where: previewIllustrationWhere,
          orderBy: { pageNumber: "asc" },
        },
      },
    });
    if (refreshed) {
      order = refreshed;
    }
  }

  const pages = buildPreviewBookPages(order.illustrations);
  const paid = order.paymentStatus === "PAID";
  const waitingForGeneration =
    !paid &&
    pages.some(
      (page) =>
        !page.id || page.status === "IDLE" || page.status === "PROCESSING",
    );
  const previewReady = pages.every(
    (page) => page.id && page.status === "COMPLETED" && page.imagePath,
  );

  return (
    <>
      <IntervalRefresher
        active={waitingForGeneration && !paid}
        href={`/api/orders/${order.id}/status`}
        initialSignature={JSON.stringify(
          illustrationStatusPayload(
            pages
              .filter((page) => page.id)
              .map((page) => ({
                id: page.id as string,
                status: page.status,
                imagePath: page.imagePath,
              })),
          ),
        )}
      />
      <OrderPreviewBook
        title={order.template.title}
        backHref="/dashboard"
        pages={pages}
        paid={paid}
        ready={previewReady}
        orderId={order.id}
      />
    </>
  );
}
