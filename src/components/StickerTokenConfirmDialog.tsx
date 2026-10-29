"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

export function StickerTokenConfirmDialog({
  open,
  tokens,
  pending,
  pendingLabel = "생성 중...",
  pendingMessage = "스티커를 그리는 중이에요. 잠시만 기다려 주세요.",
  description = "특수 제작 이미지를 만들면 토큰 1개가 사용돼요. 토큰으로 주문이 끝나면 다시 돌려드려요.",
  confirmLabel = "수락",
  confirmDisabled = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  tokens: number;
  pending?: boolean;
  pendingLabel?: string;
  pendingMessage?: string;
  description?: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
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
  }, [open, pending, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-stone-900/40"
        disabled={pending}
        onClick={() => {
          if (!pending) {
            onClose();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-[#f7f4ef] shadow-2xl"
      >
        <div className="border-b border-stone-200/80 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-stone-800">
            {pending ? "만들고 있어요" : "토큰을 사용할까요?"}
          </h2>
        </div>
        <div className="space-y-3 px-5 py-5">
          {pending ? (
            <div
              className="flex flex-col items-center gap-4 py-3"
              role="status"
              aria-live="polite"
            >
              <style>{`
                @keyframes special-loading {
                  0% { transform: translateX(-120%); }
                  100% { transform: translateX(340%); }
                }
              `}</style>
              <span className="h-11 w-11 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
              <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full w-1/3 rounded-full bg-sky-400"
                  style={{ animation: "special-loading 1.1s ease-in-out infinite" }}
                />
              </div>
              <p className="text-center text-sm leading-relaxed text-stone-600">
                {pendingMessage}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-stone-700">
                {description}
              </p>
              <p className="text-sm text-stone-500">현재 토큰 {tokens}개</p>
            </>
          )}
        </div>
        <div className="flex gap-2 border-t border-stone-200/80 px-5 py-4">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={pending || confirmDisabled}
            onClick={onConfirm}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-sky-400 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {pendingLabel}
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export { StickerTokenConfirmDialog as TokenConfirmDialog };
