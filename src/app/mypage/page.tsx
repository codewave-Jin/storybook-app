import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import {
  formatDateTime,
  getFulfillmentHint,
  getFulfillmentLabel,
  PAYMENT_STATUS_LABEL,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function MyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/mypage");
  }

  const userId = session.user.id;

  const [user, storybookOrders, stickerOrders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.storybookOrder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { template: { select: { title: true } } },
    }),
    prisma.stickerOrder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        template: { select: { label: true } },
        character: { select: { label: true } },
      },
    }),
  ]);

  if (!user) {
    redirect("/api/auth/force-logout?callbackUrl=/login%3FcallbackUrl%3D%2Fmypage");
  }

  const orders = [
    ...storybookOrders.map((order) => ({
      id: order.id,
      kind: "storybook" as const,
      title: order.template.title,
      href: `/dashboard/orders/${order.id}/preview`,
      paymentStatus: order.paymentStatus,
      productionStatus: order.productionStatus,
      createdAt: order.createdAt,
    })),
    ...stickerOrders.map((order) => ({
      id: order.id,
      kind: "sticker" as const,
      title: `${order.character.label} · ${order.template.label}`,
      href: `/dashboard/sticker/${order.id}/preview`,
      paymentStatus: order.paymentStatus,
      productionStatus: order.productionStatus,
      createdAt: order.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <MyPageShell title="주문 / 배송" user={user}>
      {orders.length === 0 ? (
        <p className="rounded-[24px] bg-white px-4 py-12 text-center text-sm text-stone-500 shadow-sm ring-1 ring-stone-200">
          아직 주문이 없습니다.
          <Link
            href="/dashboard"
            className="mt-2 block font-medium text-[#E07A5F] hover:underline"
          >
            대시보드에서 만들어보기
          </Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const fulfillment = getFulfillmentLabel(
              order.paymentStatus,
              order.productionStatus,
            );
            const hint = getFulfillmentHint(
              order.paymentStatus,
              order.productionStatus,
            );

            return (
              <li key={`${order.kind}-${order.id}`}>
                <Link
                  href={order.href}
                  className="block rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 transition hover:ring-[#E07A5F]/30 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                        order.kind === "storybook"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-[#FDE8E0] text-[#E07A5F]",
                      )}
                    >
                      {order.kind === "storybook" ? "동화책" : "스티커"}
                    </span>
                    <span className="rounded-full bg-[#FFF6F3] px-2.5 py-0.5 text-[11px] font-medium text-[#E07A5F]">
                      {fulfillment}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-stone-800">{order.title}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {formatDateTime(order.createdAt)}
                    <span className="mx-1.5 text-stone-300">·</span>
                    {PAYMENT_STATUS_LABEL[order.paymentStatus]}
                  </p>
                  {hint ? (
                    <p className="mt-2 text-sm text-stone-600">{hint}</p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </MyPageShell>
  );
}
