import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { auth } from "@/auth";
import { BrandLogo } from "@/components/BrandLogo";

type DashboardShellProps = {
  title: string;
  titleAccessory?: ReactNode;
  children: React.ReactNode;
};

export async function DashboardShell({
  title,
  titleAccessory,
  children,
}: DashboardShellProps) {
  const session = await auth();
  const isAdmin = Boolean(session?.user?.isAdmin);

  return (
    <main className="min-h-dvh bg-stone-50 px-4 pt-3 pb-6 text-stone-900 sm:px-6 sm:pt-4 sm:pb-8">
      <div className="mx-auto w-full max-w-6xl">
        <header>
          <div className="flex items-start justify-between gap-3">
            <BrandLogo href="/" size="sm" />
            <div className="-mt-1 flex shrink-0 items-center gap-2">
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="flex h-10 items-center rounded-xl bg-sky-400 px-4 text-sm font-medium text-white"
                >
                  관리자 페이지
                </Link>
              ) : null}
              {session?.user ? (
                <>
                  <Link
                    href="/mypage"
                    className="flex h-10 items-center rounded-xl border border-stone-300 px-4 text-sm font-medium hover:bg-white"
                  >
                    마이페이지
                  </Link>
                  <form action={logout}>
                    <button
                      type="submit"
                      className="h-10 rounded-xl border border-stone-300 px-4 text-sm font-medium hover:bg-white"
                    >
                      로그아웃
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login?callbackUrl=/dashboard"
                  className="flex h-10 items-center rounded-xl bg-sky-400 px-4 text-sm font-medium text-white"
                >
                  로그인
                </Link>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="shrink-0 text-2xl font-semibold tracking-tight">
              {title}
            </h1>
            {titleAccessory ? (
              <div className="ml-auto min-w-0">{titleAccessory}</div>
            ) : null}
          </div>
        </header>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
