import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type DashboardShellProps = {
  title: string;
  children: React.ReactNode;
};

export async function DashboardShell({ title, children }: DashboardShellProps) {
  const session = await auth();
  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
      })
    : null;
  const isAdmin = Boolean(dbUser?.isAdmin);

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-900 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="text-sm font-medium tracking-wide text-stone-500"
            >
              storybook-app
            </Link>
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin ? (
              <Link
                href="/admin"
                className="flex h-10 items-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white"
              >
                관리자 페이지
              </Link>
            ) : null}
            <form action={logout}>
              <button
                type="submit"
                className="h-10 rounded-xl border border-stone-300 px-4 text-sm font-medium hover:bg-white"
              >
                로그아웃
              </button>
            </form>
          </div>
        </header>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
