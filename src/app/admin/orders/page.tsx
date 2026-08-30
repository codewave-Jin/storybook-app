import type { Prisma } from "@prisma/client";
import { AdminOrdersBoard } from "@/components/admin/AdminOrdersBoard";
import {
  defaultExpectedDeliveryAt,
  FULFILLMENT_STATUS_FILTERS,
  isFulfillmentStatus,
} from "@/lib/fulfillment";
import { formatDate, formatDateTime } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function ordersHref(query: string, status?: string) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (status && status !== "ALL") {
    params.set("status", status);
  }
  const value = params.toString();
  return value ? `/admin/orders?${value}` : "/admin/orders";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const query = searchParams.q?.trim() ?? "";
  const statusFilter =
    searchParams.status && isFulfillmentStatus(searchParams.status)
      ? searchParams.status
      : undefined;

  const where: Prisma.StorybookOrderWhereInput = {
    ...(statusFilter ? { fulfillmentStatus: statusFilter } : {}),
    ...(query
      ? {
          user: {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const orders = await prisma.storybookOrder.findMany({
    where,
    include: {
      user: { select: { email: true, name: true } },
      template: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = orders.map((order) => ({
    id: order.id,
    userName: order.user.name,
    userEmail: order.user.email,
    productTitle: order.template.title,
    fulfillmentStatus: order.fulfillmentStatus ?? "PREPARING",
    createdAt: formatDateTime(order.createdAt),
    expectedDeliveryAt: formatDate(
      order.expectedDeliveryAt ?? defaultExpectedDeliveryAt(order.createdAt),
    ),
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">주문 관리</h1>
      <p className="mt-1 text-sm text-stone-500">
        행을 클릭하면 배송 상태를 변경하고 캐릭터 이미지를 확인할 수 있습니다.
        삭제하면 주문과 연결된 삽화가 함께 지워집니다.
      </p>

      <form
        method="get"
        className="mt-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <label className="block min-w-0 flex-1 text-sm">
          <span className="mb-1.5 block font-medium text-stone-700">유저 검색</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="이메일 또는 닉네임"
            className="h-10 w-full rounded-lg border border-stone-300 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
          />
        </label>
        {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
        <button
          type="submit"
          className="h-10 rounded-lg bg-sky-400 px-4 text-sm font-medium text-white hover:bg-sky-500"
        >
          검색
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {FULFILLMENT_STATUS_FILTERS.map((filter) => {
          const active = filter.value === "ALL" ? !statusFilter : statusFilter === filter.value;
          return (
            <a
              key={filter.value}
              href={ordersHref(query, filter.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                active
                  ? "bg-stone-800 text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100",
              )}
            >
              {filter.label}
            </a>
          );
        })}
      </div>

      <AdminOrdersBoard orders={rows} />
    </div>
  );
}
