"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { FulfillmentStatus } from "@prisma/client";
import {
  getAdminOrderDetail,
  getAdminStickerOrderDetail,
  updateOrderFulfillment,
  updateStickerOrderFulfillment,
  type AdminOrderDetail,
  type AdminStickerOrderDetail,
  type FulfillmentUpdateState,
  type StickerFulfillmentUpdateState,
} from "@/app/actions/admin";
import {
  allowedFulfillmentTargets,
  FULFILLMENT_STATUS_LABEL,
  SHIPPING_CARRIERS,
  STICKER_FULFILLMENT_STATUS_LABEL,
} from "@/lib/fulfillment";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";
import { AppImage } from "@/components/AppImage";
import { toProtectedMediaSrc } from "@/lib/media-paths";
import {
  formatDateTime,
  PAYMENT_STATUS_LABEL,
  stickerAdminStatus,
} from "@/lib/orders";
import { cn } from "@/lib/utils";

export type AdminOrderRow = {
  id: string;
  kind: "STORYBOOK" | "STICKER";
  userName: string;
  userEmail: string;
  productKindLabel: string;
  productTitle: string;
  statusLabel: string;
  statusClass: string;
  createdAt: string;
  expectedDeliveryAt: string;
};

function originalMediaHref(src: string | null | undefined) {
  if (!src) {
    return "#";
  }
  return toProtectedMediaSrc(src, "original");
}

function StatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        className,
      )}
    >
      {label}
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
              {detail.printComment ? (
                <div className="sm:col-span-2">
                  <dt className="text-stone-500">수정 사항</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap font-medium text-stone-800">
                    {detail.printComment}
                  </dd>
                </div>
              ) : null}
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
                <a
                  href={`/api/admin/orders/${detail.id}/download-zip`}
                  className="inline-flex h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  삽화 받기
                </a>
                <a
                  href={`/api/admin/orders/${detail.id}/download-story-text`}
                  className="inline-flex h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  본문 글 받기
                </a>
                <a
                  href={`/api/admin/orders/${detail.id}/download-album-zip`}
                  className="inline-flex h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  사진첩 인쇄본
                </a>
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
                          href={originalMediaHref(character.originalPhotoPath)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-600 hover:underline"
                        >
                          원본 사진
                        </a>
                        {character.generatedImagePath ? (
                          <a
                            href={originalMediaHref(character.generatedImagePath)}
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

function shippingLines(detail: AdminStickerOrderDetail) {
  return [
    detail.shippingName,
    detail.checkoutPhone,
    detail.checkoutEmail,
    [detail.shippingPostalCode, detail.shippingAddress, detail.shippingAddressDetail]
      .filter(Boolean)
      .join(" "),
  ].filter((value): value is string => Boolean(value?.trim()));
}

function StickerOrderDetailModal({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<AdminStickerOrderDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<FulfillmentStatus>("PRINTING");
  const [state, formAction] = useFormState<StickerFulfillmentUpdateState, FormData>(
    updateStickerOrderFulfillment,
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setLoadError(null);

    getAdminStickerOrderDetail(orderId)
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

  const statusBadge = detail ? stickerAdminStatus(detail) : null;
  const previewSrc =
    detail?.previewImagePath ||
    detail?.compositeImagePath ||
    detail?.finalImagePath ||
    null;
  const address = detail ? shippingLines(detail) : [];
  const targets = useMemo(
    () => (detail ? allowedFulfillmentTargets(detail.fulfillmentStatus) : []),
    [detail],
  );
  const showShippingFields = status === "SHIPPING";
  const canChangeStatus = detail?.paymentStatus === "PAID";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-sticker-order-modal-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="admin-sticker-order-modal-title" className="text-lg font-semibold">
              스티커 주문 상세
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
        ) : !detail || !statusBadge ? (
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
                <dd className="mt-0.5 font-medium">스티커 · {detail.productTitle}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-stone-500">문구</dt>
                <dd className="mt-0.5 whitespace-pre-wrap font-medium">{detail.phrase}</dd>
              </div>
              <div>
                <dt className="text-stone-500">사이즈 / 수량</dt>
                <dd className="mt-0.5 font-medium">
                  {detail.sizeLabel} · {detail.sheetCount}장 · {detail.quantity}장분
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">상태</dt>
                <dd className="mt-0.5">
                  <StatusBadge label={statusBadge.label} className={statusBadge.className} />
                  <p className="mt-1 text-xs text-stone-500">
                    결제 {PAYMENT_STATUS_LABEL[detail.paymentStatus]}
                  </p>
                </dd>
              </div>
              {address.length > 0 ? (
                <div className="sm:col-span-2">
                  <dt className="text-stone-500">배송 정보</dt>
                  <dd className="mt-0.5 space-y-0.5 font-medium">
                    {address.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </dd>
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <dt className="text-stone-500">배송 정보</dt>
                  <dd className="mt-0.5 text-stone-400">입력된 배송지가 없습니다.</dd>
                </div>
              )}
              {detail.errorReason ? (
                <div className="sm:col-span-2">
                  <dt className="text-stone-500">오류</dt>
                  <dd className="mt-0.5 text-red-600">{detail.errorReason}</dd>
                </div>
              ) : null}
            </dl>

            {canChangeStatus ? (
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
                        {STICKER_FULFILLMENT_STATUS_LABEL[value]}
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

                <SubmitStatusButton />
              </form>
            ) : (
              <p className="mt-5 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-500">
                결제가 끝난 뒤에 인쇄·배송 상태를 바꿀 수 있습니다.
              </p>
            )}

            {previewSrc ? (
              <section className="mt-5">
                <h3 className="text-sm font-medium text-stone-700">스티커 미리보기</h3>
                <a
                  href={originalMediaHref(previewSrc)}
                  target="_blank"
                  rel="noreferrer"
                  className="relative mt-3 block aspect-square max-w-56 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"
                >
                  <AppImage
                    src={previewSrc}
                    alt="스티커 미리보기"
                    fill
                    mediaVariant="original"
                    className="object-contain"
                    sizes="224px"
                  />
                </a>
              </section>
            ) : null}

            <section className="mt-6">
              <h3 className="text-sm font-medium text-stone-700">캐릭터 이미지</h3>
              <ul className="mt-3 space-y-3">
                <li className="rounded-xl border border-stone-200 px-3 py-2 text-sm">
                  <p className="font-medium">{detail.character.label}</p>
                  <div className="mt-1 flex flex-wrap gap-3">
                    <a
                      href={originalMediaHref(detail.character.originalPhotoPath)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 hover:underline"
                    >
                      원본 사진
                    </a>
                    {detail.character.generatedImagePath ? (
                      <a
                        href={originalMediaHref(detail.character.generatedImagePath)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:underline"
                      >
                        생성 결과
                      </a>
                    ) : (
                      <span className="text-stone-400">생성 결과 없음</span>
                    )}
                    {previewSrc ? (
                      <a
                        href={originalMediaHref(previewSrc)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:underline"
                      >
                        스티커 이미지
                      </a>
                    ) : null}
                  </div>
                </li>
              </ul>
            </section>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <DeleteOrderButton
                orderId={detail.id}
                kind="STICKER"
                onDeleted={() => {
                  onClose();
                  router.refresh();
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function AdminOrdersBoard({ orders }: { orders: AdminOrderRow[] }) {
  const [selected, setSelected] = useState<{
    id: string;
    kind: "STORYBOOK" | "STICKER";
  } | null>(null);

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
              key={`${order.kind}-${order.id}`}
              className="rounded-2xl border border-stone-200 bg-white p-4"
            >
              <button
                type="button"
                aria-label={`${order.userName} 주문 상세`}
                onClick={() => setSelected({ id: order.id, kind: order.kind })}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{order.userName}</p>
                  <StatusBadge label={order.statusLabel} className={order.statusClass} />
                </div>
                <p className="mt-1 break-all text-sm text-stone-500">{order.userEmail}</p>
                <p className="mt-2 text-sm text-stone-700">
                  <span className="mr-1.5 text-xs font-medium text-stone-400">
                    {order.productKindLabel}
                  </span>
                  {order.productTitle}
                </p>
                <p className="mt-1 break-all text-xs text-stone-400">{order.id}</p>
                <p className="mt-2 text-xs text-stone-500">
                  주문 {order.createdAt} · 배송예정 {order.expectedDeliveryAt}
                </p>
              </button>
              <div className="mt-3 flex justify-end">
                <DeleteOrderButton orderId={order.id} kind={order.kind} />
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">유저명</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">주문번호</th>
              <th className="px-4 py-3 font-medium">상품</th>
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
                <td colSpan={9} className="px-4 py-12 text-center text-stone-400">
                  주문이 없습니다.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={`${order.kind}-${order.id}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${order.userName} 주문 상세`}
                  onClick={() => setSelected({ id: order.id, kind: order.kind })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected({ id: order.id, kind: order.kind });
                    }
                  }}
                  className="cursor-pointer border-t border-stone-100 hover:bg-stone-50"
                >
                  <td className="px-4 py-3 font-medium">{order.userName}</td>
                  <td className="px-4 py-3 break-all">{order.userEmail}</td>
                  <td className="px-4 py-3 break-all text-xs text-stone-500">
                    {order.id}
                  </td>
                  <td className="px-4 py-3">{order.productKindLabel}</td>
                  <td className="px-4 py-3">{order.productTitle}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={order.statusLabel} className={order.statusClass} />
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
                    <DeleteOrderButton orderId={order.id} kind={order.kind} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected?.kind === "STORYBOOK" ? (
        <OrderDetailModal
          key={selected.id}
          orderId={selected.id}
          onClose={() => setSelected(null)}
        />
      ) : null}
      {selected?.kind === "STICKER" ? (
        <StickerOrderDetailModal
          key={selected.id}
          orderId={selected.id}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}
