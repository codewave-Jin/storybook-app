"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/mypage", label: "주문/배송", match: (path: string) => path === "/mypage" },
  {
    href: "/mypage/reviews",
    label: "내 리뷰",
    match: (path: string) => path.startsWith("/mypage/reviews"),
  },
] as const;

export function MyPageSidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-3">
      <Link
        href="/dashboard"
        className="flex h-12 items-center justify-between rounded-[24px] border-2 border-sky-400 bg-sky-50 px-4 text-sm font-semibold text-sky-800 shadow-sm transition hover:bg-sky-100"
      >
        대시보드
        <span aria-hidden className="text-base font-medium text-sky-500">
          →
        </span>
      </Link>

      <nav className="rounded-[24px] bg-white p-3 shadow-sm ring-1 ring-stone-200 sm:p-4">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
          마이페이지
        </p>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-11 items-center rounded-2xl px-3 text-sm font-medium transition",
                    active
                      ? "bg-[#FDE8E0] text-[#E07A5F]"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
