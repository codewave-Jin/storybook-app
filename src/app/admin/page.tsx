import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminHomePage() {
  const [
    totalOrders,
    paidCount,
    waitingCount,
    illustratingCount,
    upscalingCount,
    completedCount,
  ] = await Promise.all([
    prisma.storybookOrder.count(),
    prisma.storybookOrder.count({ where: { paymentStatus: "PAID" } }),
    prisma.storybookOrder.count({
      where: { paymentStatus: "PAID", productionStatus: "WAITING" },
    }),
    prisma.storybookOrder.count({ where: { productionStatus: "ILLUSTRATING" } }),
    prisma.storybookOrder.count({ where: { productionStatus: "UPSCALING" } }),
    prisma.storybookOrder.count({ where: { productionStatus: "COMPLETED" } }),
  ]);

  const stats = [
    { label: "전체 주문", value: totalOrders },
    { label: "결제완료", value: paidCount },
    { label: "결제완료 · 작업대기중", value: waitingCount },
    { label: "삽화작업중", value: illustratingCount },
    { label: "업스케일중", value: upscalingCount },
    { label: "제작완료", value: completedCount },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">관리자 대시보드</h1>
      <p className="mt-1 text-sm text-stone-500">최근 주문 요약</p>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"
          >
            <p className="text-sm text-stone-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold sm:text-3xl">{stat.value}</p>
          </div>
        ))}
      </section>

      <Link
        href="/admin/orders"
        className="mt-8 inline-flex h-10 items-center rounded-lg bg-stone-900 px-4 text-sm font-medium text-white"
      >
        주문 목록 보기
      </Link>
    </div>
  );
}
