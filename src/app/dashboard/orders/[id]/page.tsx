import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const order = await prisma.storybookOrder.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    select: { id: true },
  });

  if (!order) {
    redirect("/dashboard");
  }

  redirect(`/dashboard/orders/${order.id}/preview`);
}
