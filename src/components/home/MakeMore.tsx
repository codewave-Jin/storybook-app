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
      className="flex cursor-not-allowed items-center gap-4 rounded-[24px] bg-white p-4 text-left shadow-sm ring-1 ring-sky-100 sm:gap-5 sm:p-5"
    >
      <span
        className={`relative shrink-0 overflow-hidden rounded-2xl bg-sky-50 ${
          isContain ? "aspect-video h-24" : "h-24 w-24"
        }`}
      >
        <AppImage
          src={image}
          alt=""
          fill
          className={isContain ? "object-contain object-center" : "object-cover"}
          sizes={isContain ? "140px" : "96px"}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-stone-800">{title}</h3>
          <span className="inline-flex rounded-full bg-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-500">
            Coming Soon
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-stone-500">
          {description}
        </p>
        {hint ? (
          <p className="mt-2 text-sm font-medium text-stone-500">
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
}: {
  href: string;
  title: string;
  description: string;
  image: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-[24px] bg-white p-4 text-left shadow-sm ring-2 ring-sky-200 transition hover:bg-sky-50/60 hover:ring-sky-400 sm:gap-5 sm:p-5"
    >
      <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-sky-100">
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
          <h3 className="font-semibold text-stone-800">{title}</h3>
          <span className="inline-flex rounded-full bg-[#F6E7C1] px-2.5 py-1 text-[11px] font-medium text-[#8A5A12]">
            지금 이용 가능
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-stone-500">
          {description}
        </p>
      </div>
    </Link>
  );
}

export function MakeMore() {
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

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <AvailableCard
          href="/dashboard"
          image="/landing/make-storybook.jpg"
          title="동화책"
          description="우리 가족이 주인공인 특별한 이야기"
        />

        <AvailableCard
          href="/dashboard"
          image="/landing/make-sticker.jpg"
          title="스티커"
          description="일기장, 편지, 선물 포장에 붙이는 우리 가족 스티커"
        />

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
