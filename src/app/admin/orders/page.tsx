import Link from "next/link";
import type { ProductionStatus } from "@prisma/client";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";
import { prisma } from "@/lib/prisma";
import {
  formatDateTime,
  PAYMENT_STATUS_FILTERS,
  PAYMENT_STATUS_LABEL,
  PRODUCTION_STATUS_FILTERS,
  PRODUCTION_STATUS_LABEL,
  type PaymentListFilter,
} from "@/lib/orders";
import { cn } from "@/lib/utils";

const PRODUCTION_STATUSES = [
  "WAITING",
  "ILLUSTRATING",
  "UPSCALING",
  "COMPLETED",
] as const;

function parsePaymentFilter(value?: string): PaymentListFilter {
  if (value === "PENDING" || value === "ALL") {
    return value;
  }
  return "PAID";
}

function ordersHref(payment: PaymentListFilter, status?: string) {
  const params = new URLSearchParams();
  if (payment !== "PAID") {
    params.set("payment", payment);
  }
  if (status && status !== "ALL") {
    params.set("status", status);
  }
  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; payment?: string };
}) {
  const paymentFilter = parsePaymentFilter(searchParams.payment);
  const status = searchParams.status;
  const productionStatus =
    status && PRODUCTION_STATUSES.includes(status as ProductionStatus)
      ? (status as ProductionStatus)
      : undefined;

  const paymentWhere =
    paymentFilter === "ALL" ? {} : { paymentStatus: paymentFilter };
  const productionWhere = productionStatus
    ? { productionStatus }
    : {};

  const [orders, paidCount, pendingCount] = await Promise.all([
    prisma.storybookOrder.findMany({
      where: { ...paymentWhere, ...productionWhere },
      include: {
        user: { select: { email: true, name: true } },
        template: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.storybookOrder.count({
      where: { paymentStatus: "PAID", ...productionWhere },
    }),
    prisma.storybookOrder.count({
      where: { paymentStatus: "PENDING", ...productionWhere },
    }),
  ]);

  const tabCounts: Record<PaymentListFilter, number | undefined> = {
    PAID: paidCount,
    PENDING: pendingCount,
    ALL: paidCount + pendingCount,
  };

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">주문 관리</h1>
      <p className="mt-1 text-sm text-stone-500">
        {paymentFilter === "PAID"
          ? "결제 완료된 주문입니다. 실제 작업이 필요한 목록입니다."
          : paymentFilter === "PENDING"
            ? "미리보기만 생성된, 아직 결제하지 않은 주문입니다."
            : "결제 완료와 미결제 미리보기를 모두 봅니다. 미결제는 흐리게 표시됩니다."}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {PAYMENT_STATUS_FILTERS.map((filter) => {
          const active = paymentFilter === filter.value;
          const count = tabCounts[filter.value];

          return (
            <Link
              key={filter.value}
              href={ordersHref(filter.value, status)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                active
                  ? "bg-sky-400 text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100",
              )}
            >
              {filter.label}
              {typeof count === "number" ? (
                <span className={cn("ml-1.5", active ? "text-white/80" : "text-stone-400")}>
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRODUCTION_STATUS_FILTERS.map((filter) => {
          const active =
            filter.value === "ALL"
              ? !status || status === "ALL"
              : status === filter.value;

          return (
            <Link
              key={filter.value}
              href={ordersHref(paymentFilter, filter.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                active
                  ? "bg-stone-800 text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {orders.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white px-4 py-12 text-center text-sm text-stone-400">
            주문이 없습니다.
          </p>
        ) : (
          orders.map((order) => {
            const unpaid = order.paymentStatus !== "PAID";
            const dimmed = unpaid && paymentFilter === "ALL";
            return (
              <div
                key={order.id}
                className={cn(
                  "rounded-2xl border border-stone-200 bg-white p-4",
                  dimmed && "opacity-60",
                )}
              >
                <Link href={`/admin/orders/${order.id}`} className="block">
                  <p className="break-all font-medium">{order.user.email}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {order.template.title}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {formatDateTime(order.createdAt)}
                  </p>
                  <p className="mt-2 text-sm text-stone-500">
                    {PAYMENT_STATUS_LABEL[order.paymentStatus]} ·{" "}
                    {PRODUCTION_STATUS_LABEL[order.productionStatus]}
                  </p>
                </Link>
                <div className="mt-3">
                  <DeleteOrderButton orderId={order.id} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">주문일시</th>
              <th className="px-4 py-3 font-medium">유저 이메일</th>
              <th className="px-4 py-3 font-medium">템플릿명</th>
              <th className="px-4 py-3 font-medium">결제상태</th>
              <th className="px-4 py-3 font-medium">제작상태</th>
              <th className="px-4 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-stone-400">
                  주문이 없습니다.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const unpaid = order.paymentStatus !== "PAID";
                const dimmed = unpaid && paymentFilter === "ALL";
                return (
                  <tr
                    key={order.id}
                    className={cn(
                      "border-t border-stone-100 hover:bg-stone-50",
                      dimmed && "bg-stone-50 text-stone-400",
                    )}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="block">
                        {formatDateTime(order.createdAt)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="block">
                        {order.user.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="block">
                        {order.template.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="block">
                        {PAYMENT_STATUS_LABEL[order.paymentStatus]}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="block">
                        {PRODUCTION_STATUS_LABEL[order.productionStatus]}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <DeleteOrderButton orderId={order.id} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
