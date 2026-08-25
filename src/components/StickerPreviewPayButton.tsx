"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  payForStickerOrder,
  type PayStickerOrderState,
} from "@/app/actions/stickers";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-[#E07A5F] text-sm font-semibold text-white shadow-sm hover:bg-[#d56c51] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "결제 중..." : "결제하고 실제 스티커 받기"}
    </button>
  );
}

export function StickerPreviewPayButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [state, formAction] = useFormState<PayStickerOrderState, FormData>(
    payForStickerOrder,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      {state?.error ? (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
      <p className="mt-1.5 text-center text-xs text-stone-500">
        지금은 테스트 결제입니다. 버튼을 누르면 결제가 완료됩니다.
      </p>
    </form>
  );
}
