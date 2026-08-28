"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

const LINKS = [
  { href: "#how", label: "캐릭터 만들기" },
  { href: "#themes", label: "테마 보기" },
  { href: "#faq", label: "FAQ" },
];

type HomeNavProps = {
  isLoggedIn: boolean;
};

export function HomeNav({ isLoggedIn }: HomeNavProps) {
  const [open, setOpen] = useState(false);
  const accountHref = isLoggedIn ? "/mypage" : "/dashboard";
  const accountLabel = isLoggedIn ? "마이페이지" : "대시보드";

  return (
    <header className="sticky top-0 z-40 border-b border-sky-100/80 bg-stone-50/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <BrandLogo href="/home" size="sm" priority />

        <nav className="hidden items-center gap-7 text-sm text-stone-600 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-stone-900">
              {link.label}
            </a>
          ))}
          <Link
            href={accountHref}
            className="rounded-full bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-900"
          >
            {accountLabel}
          </Link>
        </nav>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-stone-700 md:hidden"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="text-xl">{open ? "×" : "☰"}</span>
        </button>
      </div>

      {open ? (
        <div className="border-t border-sky-100 bg-stone-50 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1 text-base">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-3 text-stone-700"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href={accountHref}
              className="mt-1 flex h-12 items-center justify-center rounded-xl bg-stone-800 font-medium text-white"
              onClick={() => setOpen(false)}
            >
              {accountLabel}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
