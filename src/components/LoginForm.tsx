"use client";

import { useFormState, useFormStatus } from "react-dom";
import { authenticate, type AuthFormState } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-stone-900 text-base font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "로그인 중..." : "로그인"}
    </button>
  );
}

export function LoginForm({ registered }: { registered?: boolean }) {
  const [state, formAction] = useFormState<AuthFormState, FormData>(
    authenticate,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {registered ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          회원가입이 완료되었습니다. 로그인해 주세요.
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
        이메일
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="h-12 rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 outline-none ring-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
        비밀번호
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="비밀번호"
          className="h-12 rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 outline-none ring-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-2"
        />
      </label>

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
