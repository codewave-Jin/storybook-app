"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { payForOrder, type PayOrderState } from "@/app/actions/orders";
import { PaymentComingSoon } from "@/components/PaymentComingSoon";
import { PAYMENTS_ENABLED } from "@/lib/payments";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-[#E07A5F] text-sm font-semibold text-white shadow-sm hover:bg-[#d56c51] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "결제 중..." : "결제하고 전체 동화책 완성하기"}
    </button>
  );
}

export function OrderPreviewPayButton({
  orderId,
  ready,
}: {
  orderId: string;
  ready: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState<PayOrderState, FormData>(
    payForOrder,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  if (!PAYMENTS_ENABLED) {
    return <PaymentComingSoon kind="storybook" />;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      {state?.error ? (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <SubmitButton disabled={!ready} />
      {!ready ? (
        <p className="mt-1.5 text-center text-xs text-stone-500">
          표지와 장면이 모두 완성되면 결제할 수 있어요.
        </p>
      ) : null}
    </form>
  );
}
