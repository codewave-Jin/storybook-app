"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

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
      <rect
        x="10"
        y="10"
        width="28"
        height="28"
        rx="3"
        fill="none"
        stroke="#7DD3FC"
        strokeWidth="2"
      />
    </svg>
  );
}

function StickerIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden>
      <rect x="10" y="10" width="28" height="28" rx="8" fill="#E2E8F0" />
      <circle cx="20" cy="22" r="2" fill="#94A3B8" />
      <circle cx="28" cy="22" r="2" fill="#94A3B8" />
      <path
        d="M18 29c2 2.5 10 2.5 12 0"
        fill="none"
        stroke="#94A3B8"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden>
      <rect x="8" y="14" width="24" height="20" rx="4" fill="#E2E8F0" />
      <path d="M34 20l6-3v14l-6-3V20z" fill="#CBD5E1" />
      <path d="M17 21l8 5-8 5V21z" fill="#94A3B8" />
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

export function CreateWithCharacter() {
  return (
    <section
      id="products"
      className="mx-auto max-w-5xl scroll-mt-20 px-4 py-12 sm:px-6"
    >
      <h2 className="text-center text-xl font-semibold sm:text-2xl">
        우리 가족 캐릭터로, 더 많은 걸 만들어보세요
      </h2>
      <p className="mt-2 text-center text-sm text-stone-500">
        하나의 캐릭터로 다양한 콘텐츠를 즐길 수 있어요
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link
          href="/signup"
          className="flex flex-col rounded-[24px] bg-white p-5 text-left shadow-sm ring-2 ring-sky-300 transition hover:bg-sky-50/60 hover:ring-sky-400"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100">
              <BookIcon />
            </span>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-medium text-sky-600">
              지금 이용 가능
            </span>
          </div>
          <h3 className="mt-4 font-semibold text-stone-800">맞춤 동화책</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            우리 가족이 주인공인 특별한 이야기
          </p>
        </Link>

        <ComingSoonCard
          icon={<StickerIcon />}
          title="캐릭터 스티커"
          description="카카오톡, 메시지에서 쓰는 우리 가족 이모티콘"
        />

        <ComingSoonCard
          icon={<VideoIcon />}
          title="캐릭터 영상"
          description="우리 가족이 움직이고 말하는 짧은 영상"
        />
      </div>
    </section>
  );
}
