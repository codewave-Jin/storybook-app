import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
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
    include: {
      template: true,
    },
  });

  if (!order) {
    notFound();
  }

  if (order.paymentStatus !== "PAID") {
    redirect(`/dashboard/orders/${order.id}/preview`);
  }

  return (
    <DashboardShell title="주문 상세">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <p className="text-lg font-semibold">주문이 완료되었습니다</p>
        <p className="mt-2 text-sm text-stone-500">
          {order.template.title} 제작을 준비 중이에요.
        </p>
        <p className="mt-4 text-xs text-stone-400">주문번호 {order.id}</p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-sky-400 px-5 text-sm font-medium text-white"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </DashboardShell>
  );
}
