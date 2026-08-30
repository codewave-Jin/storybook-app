"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteOrder } from "@/app/actions/admin";

export function DeleteOrderButton({
  orderId,
  redirectTo,
  onDeleted,
}: {
  orderId: string;
  redirectTo?: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteOrder(orderId);
      setOpen(false);
      onDeleted?.();
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
        return;
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
          setOpen(true);
        }}
        className="h-9 rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50"
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
            <h2 className="text-lg font-semibold">주문 삭제</h2>
            <p className="mt-2 text-sm text-stone-500">
              이 주문과 연결된 삽화를 모두 삭제할까요? 삭제하면 되돌릴 수
              없습니다.
            </p>
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
                className="h-11 rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
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
