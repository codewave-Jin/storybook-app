"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { FulfillmentStatus } from "@prisma/client";
import {
  getAdminOrderDetail,
  updateOrderFulfillment,
  type AdminOrderDetail,
  type FulfillmentUpdateState,
} from "@/app/actions/admin";
import {
  allowedFulfillmentTargets,
  FULFILLMENT_STATUS_LABEL,
  SHIPPING_CARRIERS,
} from "@/lib/fulfillment";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";
import { formatDateTime } from "@/lib/orders";
import { cn } from "@/lib/utils";

export type AdminOrderRow = {
  id: string;
  userName: string;
  userEmail: string;
  productTitle: string;
  fulfillmentStatus: FulfillmentStatus;
  createdAt: string;
  expectedDeliveryAt: string;
};

function StatusBadge({ status }: { status: FulfillmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "DELIVERED" && "bg-emerald-50 text-emerald-700",
        status === "SHIPPING" && "bg-sky-50 text-sky-700",
        status === "PRINTED" && "bg-violet-50 text-violet-700",
        status === "PRINTING" && "bg-amber-50 text-amber-700",
        status === "PREPARING" && "bg-stone-100 text-stone-600",
      )}
    >
      {FULFILLMENT_STATUS_LABEL[status]}
    </span>
  );
}

function SubmitStatusButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center rounded-lg bg-sky-400 px-4 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
    >
      {pending ? "저장 중..." : "상태 저장"}
    </button>
  );
}

function OrderDetailModal({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<FulfillmentStatus>("PREPARING");
  const [state, formAction] = useFormState<FulfillmentUpdateState, FormData>(
    updateOrderFulfillment,
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setLoadError(null);

    getAdminOrderDetail(orderId)
      .then((order) => {
        if (cancelled) {
          return;
        }
        if (!order) {
          setLoadError("주문을 찾을 수 없습니다.");
          return;
        }
        setDetail(order);
        setStatus(order.fulfillmentStatus);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("주문 정보를 불러오지 못했습니다.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!state?.order) {
      return;
    }
    setDetail(state.order);
    setStatus(state.order.fulfillmentStatus);
    router.refresh();
  }, [state, router]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const targets = useMemo(
    () => (detail ? allowedFulfillmentTargets(detail.fulfillmentStatus) : []),
    [detail],
  );
  const showShippingFields = status === "SHIPPING";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-order-modal-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="admin-order-modal-title" className="text-lg font-semibold">
              주문 상세
            </h2>
            <p className="mt-1 break-all text-xs text-stone-400">주문번호 {orderId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-3 text-sm text-stone-500 hover:bg-stone-100"
          >
            닫기
          </button>
        </div>

        {loadError ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        ) : !detail ? (
          <p className="mt-8 text-center text-sm text-stone-400">불러오는 중...</p>
        ) : (
          <>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-stone-500">유저명</dt>
                <dd className="mt-0.5 font-medium">{detail.userName}</dd>
              </div>
              <div>
                <dt className="text-stone-500">이메일</dt>
                <dd className="mt-0.5 break-all font-medium">{detail.userEmail}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-stone-500">상품명</dt>
                <dd className="mt-0.5 font-medium">{detail.productTitle}</dd>
              </div>
            </dl>

            <form action={formAction} className="mt-5 space-y-4">
              <input type="hidden" name="orderId" value={detail.id} />
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-stone-700">상태 변경</span>
                <select
                  name="status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as FulfillmentStatus)
                  }
                  className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                >
                  {targets.map((value) => (
                    <option key={value} value={value}>
                      {FULFILLMENT_STATUS_LABEL[value]}
                      {value === detail.fulfillmentStatus ? " (현재)" : " (다음)"}
                    </option>
                  ))}
                </select>
              </label>

              {showShippingFields ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-stone-700">
                      택배사
                    </span>
                    <select
                      name="carrier"
                      required
                      defaultValue={detail.shippingCarrier ?? ""}
                      className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                    >
                      <option value="" disabled>
                        택배사 선택
                      </option>
                      {detail.shippingCarrier &&
                      !(SHIPPING_CARRIERS as readonly string[]).includes(
                        detail.shippingCarrier,
                      ) ? (
                        <option value={detail.shippingCarrier}>
                          {detail.shippingCarrier}
                        </option>
                      ) : null}
                      {SHIPPING_CARRIERS.map((carrier) => (
                        <option key={carrier} value={carrier}>
                          {carrier}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-stone-700">
                      운송장번호
                    </span>
                    <input
                      name="trackingNumber"
                      required
                      defaultValue={detail.trackingNumber ?? ""}
                      placeholder="운송장번호"
                      className="h-10 w-full rounded-lg border border-stone-300 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </label>
                </div>
              ) : null}

              {state?.error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.error}
                </p>
              ) : null}
              {state?.success ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  상태가 저장되었습니다.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <SubmitStatusButton />
                <Link
                  href={`/admin/orders/${detail.id}`}
                  className="inline-flex h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  제작 상세
                </Link>
                <DeleteOrderButton
                  orderId={detail.id}
                  onDeleted={onClose}
                />
              </div>
            </form>

            <section className="mt-6">
              <h3 className="text-sm font-medium text-stone-700">캐릭터 이미지</h3>
              {detail.characters.length === 0 ? (
                <p className="mt-2 text-sm text-stone-400">연결된 캐릭터가 없습니다.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {detail.characters.map((character) => (
                    <li
                      key={character.id}
                      className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{character.label}</p>
                      <div className="mt-1 flex flex-wrap gap-3">
                        <a
                          href={character.originalPhotoPath}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-600 hover:underline"
                        >
                          원본 사진
                        </a>
                        {character.generatedImagePath ? (
                          <a
                            href={character.generatedImagePath}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-600 hover:underline"
                          >
                            생성 결과
                          </a>
                        ) : (
                          <span className="text-stone-400">생성 결과 없음</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {detail.logs.length > 0 ? (
              <section className="mt-6">
                <h3 className="text-sm font-medium text-stone-700">상태 이력</h3>
                <ul className="mt-2 space-y-1.5 text-xs text-stone-500">
                  {detail.logs.map((log) => (
                    <li key={log.id}>
                      {formatDateTime(new Date(log.createdAt))} ·{" "}
                      {log.fromStatus
                        ? FULFILLMENT_STATUS_LABEL[log.fromStatus]
                        : "-"}{" "}
                      → {FULFILLMENT_STATUS_LABEL[log.toStatus]}
                      {log.carrier ? ` · ${log.carrier} ${log.trackingNumber}` : ""}
                      {log.actorName ? ` · ${log.actorName}` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function AdminOrdersBoard({ orders }: { orders: AdminOrderRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <div className="mt-4 space-y-3 md:hidden">
        {orders.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white px-4 py-12 text-center text-sm text-stone-400">
            주문이 없습니다.
          </p>
        ) : (
          orders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-stone-200 bg-white p-4"
            >
              <button
                type="button"
                aria-label={`${order.userName} 주문 상세`}
                onClick={() => setSelectedId(order.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{order.userName}</p>
                  <StatusBadge status={order.fulfillmentStatus} />
                </div>
                <p className="mt-1 break-all text-sm text-stone-500">{order.userEmail}</p>
                <p className="mt-2 text-sm text-stone-700">{order.productTitle}</p>
                <p className="mt-1 break-all text-xs text-stone-400">{order.id}</p>
                <p className="mt-2 text-xs text-stone-500">
                  주문 {order.createdAt} · 배송예정 {order.expectedDeliveryAt}
                </p>
              </button>
              <div className="mt-3 flex justify-end">
                <DeleteOrderButton orderId={order.id} />
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">유저명</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">주문번호</th>
              <th className="px-4 py-3 font-medium">상품명</th>
              <th className="px-4 py-3 font-medium">현재 상태</th>
              <th className="px-4 py-3 font-medium">주문일</th>
              <th className="px-4 py-3 font-medium">배송예정일</th>
              <th className="px-4 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-stone-400">
                  주문이 없습니다.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${order.userName} 주문 상세`}
                  onClick={() => setSelectedId(order.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(order.id);
                    }
                  }}
                  className="cursor-pointer border-t border-stone-100 hover:bg-stone-50"
                >
                  <td className="px-4 py-3 font-medium">{order.userName}</td>
                  <td className="px-4 py-3 break-all">{order.userEmail}</td>
                  <td className="px-4 py-3 break-all text-xs text-stone-500">
                    {order.id}
                  </td>
                  <td className="px-4 py-3">{order.productTitle}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.fulfillmentStatus} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{order.createdAt}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {order.expectedDeliveryAt}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <DeleteOrderButton orderId={order.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedId ? (
        <OrderDetailModal
          key={selectedId}
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  );
}
