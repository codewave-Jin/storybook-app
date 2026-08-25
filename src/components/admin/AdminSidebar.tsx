"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드", exact: true },
  { href: "/admin/orders", label: "주문 관리" },
  { href: "/admin/illustrations", label: "삽화 생성" },
  { href: "/admin/upscale", label: "업스케일" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-40 flex w-full shrink-0 flex-col border-b border-stone-200 bg-white lg:static lg:w-60 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:border-b lg:border-stone-200 lg:px-5 lg:py-5">
        <div>
          <p className="text-xs font-medium tracking-wide text-stone-400">
            ADMIN
          </p>
          <Link href="/admin" className="block text-base font-semibold lg:mt-1 lg:text-lg">
            관리자
          </Link>
        </div>
        <form action={logout} className="lg:hidden">
          <button
            type="submit"
            className="h-9 rounded-lg px-3 text-sm text-stone-500 hover:bg-stone-100"
          >
            로그아웃
          </button>
        </form>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:p-3">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
                active
                  ? "bg-sky-400 text-white"
                  : "text-stone-600 hover:bg-stone-100",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-stone-200 p-3 lg:block">
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-stone-500 hover:bg-stone-100"
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
