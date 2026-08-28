"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

const LINKS = [
  { href: "#products", label: "만들 수 있는 것" },
  { href: "#how", label: "만드는 방법" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-sky-100/80 bg-stone-50/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <BrandLogo href="/" size="sm" priority />

        <nav className="hidden items-center gap-6 text-sm text-stone-600 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-stone-900">
              {link.label}
            </a>
          ))}
          <Link href="/login" className="hover:text-stone-900">
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-sky-400 px-4 py-2 font-medium text-white hover:bg-sky-500"
          >
            시작하기
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
              href="/login"
              className="rounded-xl px-3 py-3 text-stone-700"
              onClick={() => setOpen(false)}
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="mt-1 flex h-12 items-center justify-center rounded-xl bg-sky-400 font-medium text-white"
              onClick={() => setOpen(false)}
            >
              캐릭터 만들기 시작
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
