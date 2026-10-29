"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { DaumPostcodeFields } from "@/components/DaumPostcodeFields";
import { TokenConfirmDialog } from "@/components/StickerTokenConfirmDialog";
import type { OrderOptionLine } from "@/lib/storybook-order-summary";
import {
  formatTokens,
  ORDER_QUANTITY_MAX,
  ORDER_QUANTITY_MIN,
  PHOTO_ALBUM_PRICE_TOKENS,
  STORYBOOK_PRICE_TOKENS,
  clampOrderQuantity,
  quoteStorybookOrder,
} from "@/lib/payments";

function PaySubmitButton({
  totalTokens,
  tokenBalance,
}: {
  totalTokens: number;
  tokenBalance: number;
}) {
  const { pending } = useFormStatus();
  const short = tokenBalance < totalTokens;
  return (
    <button
      type="submit"
      disabled={pending || short}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-[#E07A5F] text-sm font-semibold text-white shadow-sm hover:bg-[#d56c51] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? "사용 중..."
        : short
          ? "토큰이 부족합니다"
          : `${formatTokens(totalTokens)} 사용하고 동화책 완성하기`}
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

export function OrderCheckoutDialog({
  open,
  onClose,
  orderId,
  optionLines,
  defaultEmail,
  defaultName,
  error,
  formAction,
  tokenBalance,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  optionLines: OrderOptionLine[];
  defaultEmail?: string;
  defaultName?: string;
  error?: string;
  formAction: (formData: FormData) => void;
  tokenBalance: number;
}) {
  const [includeAlbum, setIncludeAlbum] = useState(false);
  const [quantity, setQuantity] = useState(ORDER_QUANTITY_MIN);
  const [tokenConfirmOpen, setTokenConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const tokenConfirmedRef = useRef(false);
  const titleId = useId();
  const quote = quoteStorybookOrder({
    quantity,
    includePhotoAlbum: includeAlbum,
  });

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

  function requestPay() {
    const form = formRef.current;
    if (!form || tokenBalance < quote.totalTokens) {
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    tokenConfirmedRef.current = true;
    setTokenConfirmOpen(false);
    form.requestSubmit();
  }

  return (
    <>
    {createPortal(
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
            토큰으로 주문
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

        <form
          ref={formRef}
          action={formAction}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            if (tokenConfirmedRef.current) {
              tokenConfirmedRef.current = false;
              return;
            }
            event.preventDefault();
            if (tokenBalance < quote.totalTokens) {
              return;
            }
            setTokenConfirmOpen(true);
          }}
        >
          <input type="hidden" name="orderId" value={orderId} />
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
                {optionLines.length === 0 ? (
                  <li className="text-stone-500">동화책 {quote.quantity}권</li>
                ) : null}
                <li className="border-t border-stone-100 pt-2">
                  <div className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-stone-400">수량</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="수량 줄이기"
                        disabled={quantity <= ORDER_QUANTITY_MIN}
                        onClick={() =>
                          setQuantity((current) =>
                            clampOrderQuantity(current - 1),
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-base text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-[2.5rem] text-center font-medium tabular-nums text-stone-800">
                        {quote.quantity}권
                      </span>
                      <button
                        type="button"
                        aria-label="수량 늘리기"
                        disabled={quantity >= ORDER_QUANTITY_MAX}
                        onClick={() =>
                          setQuantity((current) =>
                            clampOrderQuantity(current + 1),
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-base text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 pl-[4.75rem] text-[11px] text-stone-400">
                    2권부터 한 권 늘 때마다 10% 할인, 최대 30%
                  </p>
                </li>
              </ul>
              <input type="hidden" name="quantity" value={quote.quantity} />
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

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                옵션
              </h3>
              <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-100">
                <input
                  type="checkbox"
                  name="includePhotoAlbum"
                  checked={includeAlbum}
                  onChange={(event) => setIncludeAlbum(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-[#E07A5F]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-stone-800">
                    사진첩 추가
                  </span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    동화책과 같은 크기의 앨범에 사진을 직접 넣을 수 있어요. 한 권에 {PHOTO_ALBUM_PRICE_TOKENS}토큰이 더해져 {STORYBOOK_PRICE_TOKENS + PHOTO_ALBUM_PRICE_TOKENS}토큰이 됩니다.
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-stone-700">
                  권당 +{formatTokens(PHOTO_ALBUM_PRICE_TOKENS)}
                </span>
              </label>
            </section>

            <section className="rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-stone-100">
              <div className="flex justify-between text-stone-500">
                <span>동화책 {formatTokens(STORYBOOK_PRICE_TOKENS)} × {quote.quantity}</span>
                <span>{formatTokens(quote.bookTokens)}</span>
              </div>
              {includeAlbum ? (
                <div className="mt-1 flex justify-between text-stone-500">
                  <span>사진첩 {formatTokens(PHOTO_ALBUM_PRICE_TOKENS)} × {quote.quantity}</span>
                  <span>{formatTokens(quote.albumTokens)}</span>
                </div>
              ) : null}
              {quote.discountTokens > 0 ? (
                <>
                  <div className="mt-1 flex justify-between text-stone-500">
                    <span>소계</span>
                    <span>{formatTokens(quote.subtotalTokens)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-[#E07A5F]">
                    <span>수량 할인 {quote.discountPercent}%</span>
                    <span>-{formatTokens(quote.discountTokens)}</span>
                  </div>
                </>
              ) : null}
              <div className="mt-2 flex justify-between border-t border-stone-100 pt-2 font-semibold text-stone-800">
                <span>합계</span>
                <span>{formatTokens(quote.totalTokens)}</span>
              </div>
              <p className="mt-2 text-[11px] text-stone-400">
                보유 토큰 {tokenBalance}개. 미리보기에 쓴 토큰 1개는 완성이 끝나면 다시 돌아와요.
              </p>
            </section>
          </div>

          <div className="border-t border-stone-200/80 px-5 py-4">
            <PaySubmitButton totalTokens={quote.totalTokens} tokenBalance={tokenBalance} />
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )}
      <TokenConfirmDialog
        open={tokenConfirmOpen}
        tokens={tokenBalance}
        description={`${formatTokens(quote.totalTokens)}이 사용돼요. 미리보기에 쓴 토큰 1개는 완성이 끝나면 다시 돌아와요.`}
        confirmLabel="수락"
        onClose={() => setTokenConfirmOpen(false)}
        onConfirm={requestPay}
      />
    </>
  );
}
