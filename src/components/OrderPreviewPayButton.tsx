"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { payForOrder, type PayOrderState } from "@/app/actions/orders";
import { OrderCheckoutDialog } from "@/components/OrderCheckoutDialog";
import { PaymentComingSoon } from "@/components/PaymentComingSoon";
import type { OrderOptionLine } from "@/lib/storybook-order-summary";
import { PAYMENTS_ENABLED } from "@/lib/payments";

export function OrderPreviewPayButton({
  orderId,
  ready,
  optionLines,
  defaultEmail,
  defaultName,
}: {
  orderId: string;
  ready: boolean;
  optionLines: OrderOptionLine[];
  defaultEmail?: string;
  defaultName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState<PayOrderState, FormData>(
    payForOrder,
    undefined,
  );

  useEffect(() => {
    if (!state?.success) {
      return;
    }
    setOpen(false);
    if (state.next) {
      router.push(state.next);
      return;
    }
    router.refresh();
  }, [state, router]);

  if (!PAYMENTS_ENABLED) {
    return <PaymentComingSoon kind="storybook" />;
  }

  return (
    <>
      <button
        type="button"
        disabled={!ready}
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-[#E07A5F] text-sm font-semibold text-white shadow-sm hover:bg-[#d56c51] disabled:cursor-not-allowed disabled:opacity-50"
      >
        결제하고 전체 동화책 완성하기
      </button>
      {!ready ? (
        <p className="mt-1.5 text-center text-xs text-stone-500">
          표지와 장면이 모두 완성되면 결제할 수 있어요.
        </p>
      ) : null}
      {state?.error && !open ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <OrderCheckoutDialog
        open={open}
        onClose={() => setOpen(false)}
        orderId={orderId}
        optionLines={optionLines}
        defaultEmail={defaultEmail}
        defaultName={defaultName}
        error={state?.error}
        formAction={formAction}
      />
    </>
  );
}
