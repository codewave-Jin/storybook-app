"use client";

import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { DaumPostcodeFields } from "@/components/DaumPostcodeFields";
import type { OrderOptionLine } from "@/lib/storybook-order-summary";
import {
  STICKER_SHEET_MAX,
  STICKER_SHEET_MIN,
  STICKER_SHEET_PRICE_KRW,
  clampStickerSheetCount,
  formatKrw,
  quoteStickerOrder,
} from "@/lib/payments";

function PaySubmitButton({ total }: { total: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-[#E07A5F] text-sm font-semibold text-white shadow-sm hover:bg-[#d56c51] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "결제 중..." : `${formatKrw(total)} 결제하고 스티커 주문하기`}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  required,
  placeholder,
  inputMode,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const id = useId();
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone-600">
        {label}
        {required ? <span className="text-[#E07A5F]"> *</span> : null}
      </span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none ring-sky-200 placeholder:text-stone-400 focus:border-sky-300 focus:ring-2"
      />
    </label>
  );
}

export function StickerCheckoutDialog({
  open,
  onClose,
  optionLines,
  defaultEmail,
  defaultName,
  error,
  formAction,
  hiddenFields,
}: {
  open: boolean;
  onClose: () => void;
  optionLines: OrderOptionLine[];
  defaultEmail?: string;
  defaultName?: string;
  error?: string;
  formAction: (formData: FormData) => void;
  hiddenFields?: ReactNode;
}) {
  const [sheetCount, setSheetCount] = useState(STICKER_SHEET_MIN);
  const titleId = useId();
  const quote = quoteStickerOrder(sheetCount);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-stone-900/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90dvh,52rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-[#f7f4ef] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-stone-200/80 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-stone-800">
            주문 결제
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-white"
          >
            <span className="sr-only">닫기</span>
            ×
          </button>
        </div>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          {hiddenFields}
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                주문 내역
              </h3>
              <ul className="mt-2 space-y-1.5 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-stone-100">
                {optionLines.map((line) => (
                  <li key={line.label} className="flex gap-3">
                    <span className="w-16 shrink-0 text-stone-400">
                      {line.label}
                    </span>
                    <span className="font-medium text-stone-700">
                      {line.value}
                    </span>
                  </li>
                ))}
                <li className="border-t border-stone-100 pt-2">
                  <div className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-stone-400">장수</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="장수 줄이기"
                        disabled={sheetCount <= STICKER_SHEET_MIN}
                        onClick={() =>
                          setSheetCount((current) =>
                            clampStickerSheetCount(current - 1),
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-base text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-[2.5rem] text-center font-medium tabular-nums text-stone-800">
                        {quote.sheetCount}장
                      </span>
                      <button
                        type="button"
                        aria-label="장수 늘리기"
                        disabled={sheetCount >= STICKER_SHEET_MAX}
                        onClick={() =>
                          setSheetCount((current) =>
                            clampStickerSheetCount(current + 1),
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-base text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 pl-[4.75rem] text-[11px] text-stone-400">
                    A4 한 장에 {formatKrw(STICKER_SHEET_PRICE_KRW)}
                  </p>
                </li>
              </ul>
              <input type="hidden" name="sheetCount" value={String(quote.sheetCount)} />
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <Field
                label="이메일"
                name="checkoutEmail"
                type="email"
                autoComplete="email"
                defaultValue={defaultEmail}
                required
                placeholder="order@email.com"
              />
              <Field
                label="연락처"
                name="checkoutPhone"
                type="tel"
                autoComplete="tel"
                required
                placeholder="010-1234-5678"
                inputMode="tel"
              />
              <Field
                label="받는 분"
                name="shippingName"
                autoComplete="name"
                defaultValue={defaultName}
                required
                placeholder="이름"
              />
              <DaumPostcodeFields />
            </section>

            <section className="rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-stone-100">
              <div className="flex justify-between text-stone-500">
                <span>
                  스티커 {formatKrw(STICKER_SHEET_PRICE_KRW)} × {quote.sheetCount}장
                </span>
                <span>{formatKrw(quote.total)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-stone-100 pt-2 font-semibold text-stone-800">
                <span>합계 (예정)</span>
                <span>{formatKrw(quote.total)}</span>
              </div>
              <p className="mt-2 text-[11px] text-stone-400">
                지금은 테스트 결제입니다. 실제 결제는 나중에 연결됩니다.
              </p>
            </section>
          </div>

          <div className="border-t border-stone-200/80 px-5 py-4">
            <PaySubmitButton total={quote.total} />
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
