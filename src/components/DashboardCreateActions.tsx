"use client";

import Link from "next/link";
import { AppImage } from "@/components/AppImage";

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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <AvailableCard
          href="/dashboard/emoticon"
          image="/landing/make-emoji.jpg"
          title="이모티콘"
          description="같은 얼굴로 만드는 3×3 메시지 이모티콘"
          accent="sky"
        />
        {/* 영상 자리를 단어 그림책으로 바꿈 */}
        <AvailableCard
          href="/dashboard/wordbook"
          image="/landing/make-wordbook.jpg"
          title="단어 그림책"
          description="내 캐릭터와 함께 단어 놀이 그림책"
          accent="coral"
        />
      </div>
    </section>
  );
}
