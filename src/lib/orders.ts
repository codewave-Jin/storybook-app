import type { PaymentStatus, ProductionStatus } from "@prisma/client";

export const PRODUCTION_STATUS_LABEL: Record<ProductionStatus, string> = {
  WAITING: "대기중",
  ILLUSTRATING: "삽화작업중",
  UPSCALING: "업스케일중",
  COMPLETED: "완료",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "미리보기 (미결제)",
  PAID: "결제완료",
  FAILED: "결제실패",
};

export type PaymentListFilter = "PAID" | "PENDING" | "ALL";

export const PAYMENT_STATUS_FILTERS: Array<{
  value: PaymentListFilter;
  label: string;
}> = [
  { value: "PAID", label: "결제 완료" },
  { value: "PENDING", label: "미리보기 (미결제)" },
  { value: "ALL", label: "전체" },
];

export const PRODUCTION_STATUS_FILTERS: Array<{
  value: "ALL" | ProductionStatus;
  label: string;
}> = [
  { value: "ALL", label: "전체" },
  { value: "WAITING", label: "대기중" },
  { value: "ILLUSTRATING", label: "삽화작업중" },
  { value: "UPSCALING", label: "업스케일중" },
  { value: "COMPLETED", label: "완료" },
];

export const GENDER_LABEL = {
  MALE: "남자아이",
  FEMALE: "여자아이",
} as const;

export function parseIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function parseStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item)]),
  );
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
