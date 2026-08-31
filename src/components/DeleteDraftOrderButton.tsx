"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteDraftOrder } from "@/app/actions/orders";
import { deleteDraftStickerOrder } from "@/app/actions/stickers";
import { cn } from "@/lib/utils";

export function DeleteDraftOrderButton({
  orderId,
  title,
  kind = "storybook",
  compact = false,
  redirectTo,
}: {
  orderId: string;
  title: string;
  kind?: "storybook" | "sticker";
  compact?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const heading = kind === "sticker" ? "스티커 삭제" : "동화책 삭제";

  function handleDelete() {
    startTransition(async () => {
      const result =
        kind === "sticker"
          ? await deleteDraftStickerOrder(orderId)
          : await deleteDraftOrder(orderId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setError(null);
          setOpen(true);
        }}
        className={
          compact
            ? "h-8 shrink-0 rounded-lg px-2 text-xs font-medium text-stone-500 hover:bg-red-50 hover:text-red-600"
            : "h-10 shrink-0 rounded-full px-3 text-sm font-medium text-stone-500 hover:bg-white hover:text-red-600"
        }
      >
        삭제
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl sm:p-6"
          >
            <h2 className="text-lg font-semibold">{heading}</h2>
            <p className="mt-2 text-sm text-stone-500">
              <span className="font-medium text-stone-800">{title}</span> 작업을
              삭제할까요? 미리보기와 생성된 파일이 함께 지워지고, 되돌릴 수
              없습니다.
            </p>
            {error ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setOpen(false)}
                className="h-11 rounded-xl border border-stone-300 px-4 text-sm font-medium hover:bg-stone-50 disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className={cn(
                  "h-11 rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60",
                )}
              >
                {isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
