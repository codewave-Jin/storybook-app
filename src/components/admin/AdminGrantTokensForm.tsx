"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  grantUserTokens,
  type GrantUserTokensState,
} from "@/app/actions/admin-users";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-9 shrink-0 rounded-lg bg-sky-400 px-3 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "지급 중..." : "지급"}
    </button>
  );
}

export function AdminGrantTokensForm({
  userId,
  compact = false,
}: {
  userId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState<GrantUserTokensState, FormData>(
    grantUserTokens,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state?.success, router]);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`token-amount-${userId}`}>
          지급할 토큰
        </label>
        <input
          id={`token-amount-${userId}`}
          name="amount"
          type="number"
          min={1}
          max={1000}
          defaultValue={1}
          required
          className={
            compact
              ? "h-9 w-20 rounded-lg border border-stone-300 px-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              : "h-9 w-24 rounded-lg border border-stone-300 px-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
          }
        />
        <SubmitButton />
      </div>
      {state?.error ? (
        <p className="text-xs text-red-600">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="text-xs text-emerald-700">{state.success}</p>
      ) : null}
    </form>
  );
}
