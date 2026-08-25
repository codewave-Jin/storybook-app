"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { storybookStartHref } from "@/components/home/media";

function BookIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden>
      <rect x="8" y="10" width="32" height="28" rx="4" fill="#E0F2FE" />
      <path
        d="M24 12v24M12 16h8M12 22h8M28 16h8M28 22h8"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StickerIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden>
      <rect x="10" y="10" width="28" height="28" rx="8" fill="#FDE8E0" />
      <circle cx="20" cy="22" r="2.2" fill="#E07A5F" />
      <circle cx="28" cy="22" r="2.2" fill="#E07A5F" />
      <path
        d="M18 29c2 2.5 10 2.5 12 0"
        fill="none"
        stroke="#E07A5F"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmojiIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden>
      <rect x="10" y="10" width="28" height="28" rx="8" fill="#E8E0D8" />
      <circle cx="20" cy="22" r="2" fill="#A8988C" />
      <circle cx="28" cy="22" r="2" fill="#A8988C" />
      <path
        d="M18 29c2 2.5 10 2.5 12 0"
        fill="none"
        stroke="#A8988C"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden>
      <rect x="8" y="14" width="24" height="20" rx="4" fill="#E8E0D8" />
      <path d="M34 20l6-3v14l-6-3V20z" fill="#C4B6AA" />
      <path d="M17 21l8 5-8 5V21z" fill="#A8988C" />
    </svg>
  );
}

function ComingSoonCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  const [hint, setHint] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setHint(true)}
      className="flex cursor-not-allowed flex-col rounded-[24px] bg-white/70 p-5 text-left opacity-60 ring-1 ring-stone-200 grayscale"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
          {icon}
        </span>
        <span className="rounded-full bg-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-500">
          Coming Soon
        </span>
      </div>
      <h3 className="mt-4 font-semibold text-stone-600">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-500">{description}</p>
      {hint ? (
        <p className="mt-3 text-sm font-medium text-stone-500">
          곧 만나보실 수 있어요
        </p>
      ) : null}
    </button>
  );
}

function AvailableCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-[24px] bg-white p-5 text-left shadow-sm ring-2 ring-sky-200 transition hover:bg-sky-50/60 hover:ring-sky-400"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100">
          {icon}
        </span>
        <span className="rounded-full bg-[#F6E7C1] px-2.5 py-1 text-[11px] font-medium text-[#8A5A12]">
          지금 이용 가능
        </span>
      </div>
      <h3 className="mt-4 font-semibold text-stone-800">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-500">{description}</p>
    </Link>
  );
}

export function MakeMore({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section
      id="products"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24"
    >
      <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        우리 가족 캐릭터로, 더 많은 걸 만들어보세요
      </h2>
      <p className="mt-3 text-center text-sm text-stone-500 sm:text-base">
        하나의 캐릭터로 다양한 콘텐츠를 즐길 수 있어요
      </p>
      <p className="mt-2 text-center text-xs font-medium text-sky-500">
        동화책 · 스티커 · 이모티콘 · 영상
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AvailableCard
          href={storybookStartHref(isLoggedIn)}
          icon={<BookIcon />}
          title="동화책"
          description="우리 가족이 주인공인 특별한 이야기"
        />

        {/*
          스티커 제작 페이지가 생기면 이 href를 해당 경로로 교체하세요.
          지금은 가입/대시보드로 임시 연결합니다.
        */}
        <AvailableCard
          href={isLoggedIn ? "/dashboard" : "/signup"}
          icon={<StickerIcon />}
          title="스티커"
          description="일기장, 편지, 선물 포장에 붙이는 우리 가족 스티커"
        />

        <ComingSoonCard
          icon={<EmojiIcon />}
          title="이모티콘"
          description="카카오톡, 메시지에서 쓰는 우리 가족 이모티콘"
        />

        <ComingSoonCard
          icon={<VideoIcon />}
          title="영상"
          description="우리 가족이 움직이고 말하는 짧은 영상"
        />
      </div>
    </section>
  );
}
