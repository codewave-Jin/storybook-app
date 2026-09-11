"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryFailedStickerPreview } from "@/app/actions/retry-generation";

export function RetryStickerPreviewButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startRetry] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startRetry(async () => {
            const result = await retryFailedStickerPreview(orderId);
            if (result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
      >
        {pending ? "다시 만드는 중..." : "다시 만들기"}
      </button>
      {error ? (
        <p className="text-center text-xs text-red-600">{error}</p>
      ) : (
        <p className="text-center text-xs text-stone-500">
          서버가 바쁠 때 실패할 수 있어요. 잠시 후 다시 눌러 주세요.
        </p>
      )}
    </div>
  );
}
