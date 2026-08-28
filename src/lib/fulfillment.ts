import type { FulfillmentStatus } from "@prisma/client";

export const FULFILLMENT_STATUSES = [
  "PREPARING",
  "PRINTING",
  "PRINTED",
  "SHIPPING",
  "DELIVERED",
] as const satisfies readonly FulfillmentStatus[];

export const FULFILLMENT_STATUS_LABEL: Record<FulfillmentStatus, string> = {
  PREPARING: "준비중",
  PRINTING: "인쇄중",
  PRINTED: "인쇄완료",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
};

export const FULFILLMENT_STATUS_FILTERS: Array<{
  value: "ALL" | FulfillmentStatus;
  label: string;
}> = [
  { value: "ALL", label: "전체" },
  { value: "PREPARING", label: "준비중" },
  { value: "PRINTING", label: "인쇄중" },
  { value: "PRINTED", label: "인쇄완료" },
  { value: "SHIPPING", label: "배송중" },
  { value: "DELIVERED", label: "배송완료" },
];

export const FULFILLMENT_NEXT: Record<FulfillmentStatus, FulfillmentStatus | null> = {
  PREPARING: "PRINTING",
  PRINTING: "PRINTED",
  PRINTED: "SHIPPING",
  SHIPPING: "DELIVERED",
  DELIVERED: null,
};

export const SHIPPING_CARRIERS = [
  "CJ대한통운",
  "우체국택배",
  "한진택배",
  "롯데택배",
  "로젠택배",
  "대신택배",
] as const;

export function isFulfillmentStatus(value: string): value is FulfillmentStatus {
  return (FULFILLMENT_STATUSES as readonly string[]).includes(value);
}

export function allowedFulfillmentTargets(current: FulfillmentStatus): FulfillmentStatus[] {
  const next = FULFILLMENT_NEXT[current];
  return next ? [current, next] : [current];
}

export function canTransitionFulfillment(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
) {
  return from === to || FULFILLMENT_NEXT[from] === to;
}

export function defaultExpectedDeliveryAt(from: Date) {
  return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
}
