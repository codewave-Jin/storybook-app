import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 py-8 text-stone-900">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">storybook-app</h1>
          <p className="text-sm text-stone-500">
            우리 아이 동화책을 만들어 보세요.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-xl bg-stone-900 px-6 text-base font-medium text-white"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="flex h-12 items-center justify-center rounded-xl border border-stone-300 px-6 text-base font-medium"
          >
            회원가입
          </Link>
        </div>
      </div>
    </main>
  );
}
