import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { MyPageSidebar } from "@/components/mypage/MyPageSidebar";

export function MyPageShell({
  title,
  user,
  children,
}: {
  title: string;
  user: { name: string; email: string };
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-[#FFF8F4] px-4 py-6 text-stone-900 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <BrandLogo href="/" size="sm" />
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 truncate text-sm text-stone-500">
              {user.name}
              <span className="mx-1.5 text-stone-300">·</span>
              {user.email}
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="h-10 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-50"
            >
              로그아웃
            </button>
          </form>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
          <MyPageSidebar />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
