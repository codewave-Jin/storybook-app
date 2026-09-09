import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { PhotoAlbumEditor } from "@/components/PhotoAlbumEditor";
import { prisma } from "@/lib/prisma";
import { ensureOrderPhotoAlbumPages } from "@/lib/photo-album-pages";

export default async function OrderAlbumPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/dashboard/orders/${params.id}/album`);
  }

  const order = await prisma.storybookOrder.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      template: { select: { title: true } },
    },
  });

  if (!order) {
    notFound();
  }

  if (order.paymentStatus !== "PAID" || !order.includePhotoAlbum) {
    redirect(`/dashboard/orders/${order.id}/preview`);
  }

  await ensureOrderPhotoAlbumPages(order.id);

  const pages = await prisma.photoAlbumPage.findMany({
    where: { orderId: order.id },
    orderBy: { pageNumber: "asc" },
    select: {
      id: true,
      pageNumber: true,
      layoutId: true,
      photoPaths: true,
    },
  });

  return (
    <PhotoAlbumEditor
      title={order.template.title}
      orderId={order.id}
      pages={pages}
      printRequested={order.fulfillmentStatus !== "PREPARING"}
    />
  );
}
