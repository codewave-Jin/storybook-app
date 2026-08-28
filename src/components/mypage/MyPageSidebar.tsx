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
  {
    href: "/dashboard",
    label: "대시보드",
    match: (path: string) => path.startsWith("/dashboard"),
  },
] as const;

export function MyPageSidebar() {
  const pathname = usePathname();

  return (
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
  );
}
