"use client";

import Link from "next/link";
import { useState } from "react";
import { AppImage } from "@/components/AppImage";

function ComingSoonCard({
  title,
  description,
  image,
  imageFit = "cover",
}: {
  title: string;
  description: string;
  image: string;
  imageFit?: "cover" | "contain";
}) {
  const [hint, setHint] = useState(false);
  const isContain = imageFit === "contain";

  return (
    <button
      type="button"
      aria-disabled="true"
      onClick={() => setHint(true)}
      className="flex cursor-not-allowed items-center gap-3 rounded-2xl bg-stone-50 p-3 text-left ring-1 ring-stone-200 sm:gap-4 sm:p-4"
    >
      <span
        className={`relative shrink-0 overflow-hidden rounded-xl bg-stone-100 ${
          isContain ? "aspect-video h-16" : "h-16 w-16"
        }`}
      >
        <AppImage
          src={image}
          alt=""
          fill
          className={isContain ? "object-contain object-center opacity-70" : "object-cover opacity-70"}
          sizes={isContain ? "100px" : "64px"}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-500">{title}</h3>
          <span className="inline-flex rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-500">
            Coming Soon
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-400">
          {description}
        </p>
        {hint ? (
          <p className="mt-1.5 text-xs font-medium text-stone-500">
            곧 만나보실 수 있어요
          </p>
        ) : null}
      </div>
    </button>
  );
}

function AvailableCard({
  href,
  title,
  description,
  image,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  image: string;
  accent: "sky" | "coral";
}) {
  const ring =
    accent === "sky"
      ? "ring-sky-300 hover:ring-sky-400 bg-sky-50/80 hover:bg-sky-100/70"
      : "ring-[#E07A5F]/35 hover:ring-[#E07A5F]/55 bg-[#FFF6F3] hover:bg-[#FDE8E0]/70";
  const cta =
    accent === "sky"
      ? "bg-sky-400 text-white"
      : "bg-[#E07A5F] text-white";

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[22px] p-3 text-left shadow-sm ring-2 transition sm:gap-4 sm:p-4 ${ring}`}
    >
      <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm sm:h-24 sm:w-24">
        <AppImage
          src={image}
          alt=""
          fill
          className="object-cover"
          sizes="96px"
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-stone-800 sm:text-lg">
            {title}
          </h3>
          <span className="inline-flex rounded-full bg-[#F6E7C1] px-2.5 py-1 text-[11px] font-medium text-[#8A5A12]">
            지금 이용 가능
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          {description}
        </p>
        <span
          className={`mt-3 inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold ${cta}`}
        >
          시작하기 ›
        </span>
      </div>
    </Link>
  );
}

export function DashboardCreateActions() {
  return (
    <section className="mt-6 rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-sky-100 sm:mt-8 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-stone-800 sm:text-xl">
        이제 만들어볼까요?
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        완성한 캐릭터로 동화책이나 스티커를 시작해 보세요
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <AvailableCard
          href="/dashboard/order/new"
          image="/landing/make-storybook.jpg"
          title="동화책"
          description="우리 가족이 주인공인 특별한 이야기"
          accent="sky"
        />
        <AvailableCard
          href="/dashboard/sticker/new"
          image="/landing/make-sticker.jpg"
          title="스티커"
          description="일기장, 편지, 선물 포장에 붙이는 우리 가족 스티커"
          accent="coral"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        <ComingSoonCard
          image="/landing/make-emoji.jpg"
          title="이모티콘"
          description="카카오톡, 메시지에서 쓰는 우리 가족 이모티콘"
        />
        <ComingSoonCard
          image="/landing/make-video.jpg"
          imageFit="contain"
          title="영상"
          description="우리 가족이 움직이고 말하는 짧은 영상"
        />
      </div>
    </section>
  );
}
