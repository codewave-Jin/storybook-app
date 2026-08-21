import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime, PRODUCTION_STATUS_LABEL } from "@/lib/orders";

export default async function AdminIllustrationsPage() {
  const orders = await prisma.storybookOrder.findMany({
    where: {
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
      <h1 className="text-2xl font-semibold tracking-tight">삽화 생성</h1>
      <p className="mt-1 text-sm text-stone-500">
        대기중 또는 삽화작업중인 주문을 작업합니다.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
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
