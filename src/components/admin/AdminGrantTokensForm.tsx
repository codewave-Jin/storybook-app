"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  grantUserTokens,
  revokeUserTokens,
  type GrantUserTokensState,
} from "@/app/actions/admin-users";

type Mode = "grant" | "revoke";

const COPY: Record<Mode, { label: string; pending: string; button: string }> = {
  grant: {
    label: "지급할 토큰",
    pending: "지급 중...",
    button: "h-9 shrink-0 rounded-lg bg-sky-400 px-3 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60",
  },
  revoke: {
    label: "회수할 토큰",
    pending: "회수 중...",
    button: "h-9 shrink-0 rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60",
  },
};

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={COPY[mode].button}>
      {pending ? COPY[mode].pending : mode === "grant" ? "지급" : "회수"}
    </button>
  );
}

/** 회원 토큰 지급(유료 토큰) 또는 회수(유료 → 무료 순) */
export function AdminGrantTokensForm({
  userId,
  compact = false,
  mode = "grant",
}: {
  userId: string;
  compact?: boolean;
  mode?: Mode;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState<GrantUserTokensState, FormData>(
    mode === "grant" ? grantUserTokens : revokeUserTokens,
    undefined,
  );
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state?.success, router]);

  const inputId = `token-${mode}-${userId}`;

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (mode !== "revoke") return;
        const amount = amountRef.current?.value ?? "";
        if (!window.confirm(`토큰 ${amount}개를 회수할까요? 유료 토큰부터 빠집니다.`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-col gap-1.5"
    >
      <input type="hidden" name="userId" value={userId} />
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={inputId}>
          {COPY[mode].label}
        </label>
        <input
          ref={amountRef}
          id={inputId}
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
        <SubmitButton mode={mode} />
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
