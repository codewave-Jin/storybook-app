"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import {
  payForStickerOrder,
  type PayStickerOrderState,
} from "@/app/actions/stickers";
import { PaymentComingSoon } from "@/components/PaymentComingSoon";
import { StickerCheckoutDialog } from "@/components/StickerCheckoutDialog";
import type { OrderOptionLine } from "@/lib/storybook-order-summary";
import { PAYMENTS_ENABLED } from "@/lib/payments";

export function StickerPreviewPayButton({
  orderId,
  optionLines,
  defaultEmail,
  defaultName,
}: {
  orderId: string;
  optionLines: OrderOptionLine[];
  defaultEmail?: string;
  defaultName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState<PayStickerOrderState, FormData>(
    payForStickerOrder,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  if (!PAYMENTS_ENABLED) {
    return <PaymentComingSoon kind="sticker" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-[#E07A5F] text-sm font-semibold text-white shadow-sm hover:bg-[#d56c51]"
      >
        결제하기
      </button>
      {state?.error && !open ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <StickerCheckoutDialog
        open={open}
        onClose={() => setOpen(false)}
        optionLines={optionLines}
        defaultEmail={defaultEmail}
        defaultName={defaultName}
        error={state?.error}
        formAction={formAction}
        hiddenFields={<input type="hidden" name="orderId" value={orderId} />}
      />
    </>
  );
}
