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
    <aside className="flex w-60 shrink-0 flex-col border-r border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-5 py-5">
        <p className="text-xs font-medium tracking-wide text-stone-400">
          ADMIN
        </p>
        <Link href="/admin" className="mt-1 block text-lg font-semibold">
          관리자
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                active
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-stone-200 p-3">
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
