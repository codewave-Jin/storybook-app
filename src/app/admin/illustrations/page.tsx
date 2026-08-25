import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime, PRODUCTION_STATUS_LABEL } from "@/lib/orders";

export default async function AdminIllustrationsPage() {
  const orders = await prisma.storybookOrder.findMany({
    where: {
      paymentStatus: "PAID",
      productionStatus: { in: ["WAITING", "ILLUSTRATING"] },
    },
    include: {
      user: { select: { email: true } },
      template: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">삽화 생성</h1>
      <p className="mt-1 text-sm text-stone-500">
        결제 완료된 주문 중 대기중 또는 삽화작업중인 건만 표시합니다.
      </p>

      <div className="mt-6 space-y-3 md:hidden">
        {orders.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white px-4 py-12 text-center text-sm text-stone-400">
            작업할 주문이 없습니다.
          </p>
        ) : (
          orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/illustrations/${order.id}`}
              className="block rounded-2xl border border-stone-200 bg-white p-4"
            >
              <p className="break-all font-medium">{order.user.email}</p>
              <p className="mt-1 text-sm text-stone-600">{order.template.title}</p>
              <p className="mt-1 text-xs text-stone-400">
                {formatDateTime(order.createdAt)}
              </p>
              <p className="mt-2 text-sm text-stone-500">
                {PRODUCTION_STATUS_LABEL[order.productionStatus]}
              </p>
            </Link>
          ))
        )}
      </div>

      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">주문일시</th>
              <th className="px-4 py-3 font-medium">유저 이메일</th>
              <th className="px-4 py-3 font-medium">템플릿명</th>
              <th className="px-4 py-3 font-medium">제작상태</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-stone-400">
                  작업할 주문이 없습니다.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-stone-100 hover:bg-stone-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/illustrations/${order.id}`}
                      className="block"
                    >
                      {formatDateTime(order.createdAt)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/illustrations/${order.id}`}
                      className="block"
                    >
                      {order.user.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/illustrations/${order.id}`}
                      className="block"
                    >
                      {order.template.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/illustrations/${order.id}`}
                      className="block"
                    >
                      {PRODUCTION_STATUS_LABEL[order.productionStatus]}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
