"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import {
  PRINT_COMMENT_MAX,
  PRINT_COMMENT_PLACEHOLDER,
} from "@/lib/print-comment";

function SubmitPrintButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#E07A5F] text-sm font-semibold text-white hover:bg-[#d56c51] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "의뢰 중..." : "인쇄 의뢰하기"}
    </button>
  );
}

export function PrintRequestDialog({
  open,
  orderId,
  error,
  formAction,
  onClose,
}: {
  open: boolean;
  orderId: string;
  error?: string;
  formAction: (formData: FormData) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const commentId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
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
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-[#f7f4ef] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-stone-200/80 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-stone-800">
            인쇄 의뢰
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

        <form action={formAction} className="space-y-4 px-5 py-4">
          <input type="hidden" name="orderId" value={orderId} />
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            인쇄 의뢰를 하면 사진과 내용을 더 이상 수정할 수 없어요. 마지막인지
            한 번 더 확인해 주세요.
          </p>

          <label className="block" htmlFor={commentId}>
            <span className="mb-1.5 block text-xs font-medium text-stone-600">
              수정 사항
            </span>
            <textarea
              id={commentId}
              name="printComment"
              rows={4}
              maxLength={PRINT_COMMENT_MAX}
              placeholder={PRINT_COMMENT_PLACEHOLDER}
              className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none ring-sky-200 placeholder:text-stone-400 focus:border-sky-300 focus:ring-2"
            />
            <span className="mt-1 block text-[11px] text-stone-400">
              없으면 비워 두셔도 됩니다.
            </span>
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 flex-1 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm font-medium"
            >
              취소
            </button>
            <SubmitPrintButton />
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
