"use client";

import { useEffect, useState } from "react";
import { AppImage } from "@/components/AppImage";

/** 캐러셀 이미지는 public/landing 파일을 교체하면 됩니다. */
const SLIDES = [
  {
    src: "/landing/sample-desk.jpg",
    alt: "책상에 앉아 그림을 그리는 아이와 토끼 친구",
    quote:
      "토끼 친구와 나란히 앉아, 오늘도 예쁜 그림을 그렸어요.",
    fit: "cover",
  },
  {
    src: "/landing/sample-stickers.jpg",
    alt: "우리 아이 캐릭터로 만든 답례품 스티커",
    quote:
      "돌잔치·선생님 선물 답례품으로 많이 쓰는, 우리 아이 얼굴 스티커예요.",
    fit: "cover",
  },
  {
    src: "/landing/sample-cover.jpg",
    alt: "사랑하는 우리 아들의 작은 모험 동화책 표지",
    quote:
      "사랑하는 우리 아들의 『작은 모험』 — 표지부터 우리 아이 얼굴로요.",
    fit: "cover",
  },
  {
    src: "/landing/sample-chat-emoji.jpg",
    alt: "새해 인사 이모티콘을 보내는 채팅 화면",
    quote:
      "우리 아이 얼굴 이모티콘으로, 할아버지께 새해 인사도 보내요.",
    fit: "contain",
  },
] as const;

const TRUST_ITEMS = [
  {
    title: "사진 한 장이면",
    subtitle: "캐릭터 완성",
    color: "#E07A5F",
    icon: PhotoIcon,
  },
  {
    title: "우리 가족이",
    subtitle: "그림 속 주인공",
    color: "#3D9A6A",
    icon: BookIcon,
  },
  {
    title: "동화책 · 스티커로",
    subtitle: "이어서 만들어요",
    color: "#3B82C4",
    icon: SparkIcon,
  },
  {
    title: "안전한 결제 &",
    subtitle: "개인정보 보호",
    color: "#7B6BBF",
    icon: LockIcon,
  },
] as const;

function PhotoIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <rect x="4" y="8" width="24" height="18" rx="3" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="15" r="2.5" stroke={color} strokeWidth="2" />
      <path d="M8 24l6-7 5 5 3-3 6 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <path
        d="M6 7h9a4 4 0 0 1 4 4v14H10a4 4 0 0 1-4-4V7z"
        stroke={color}
        strokeWidth="2"
      />
      <path d="M19 7h7v14a4 4 0 0 1-4 4h-7V11a4 4 0 0 1 4-4z" stroke={color} strokeWidth="2" />
      <path d="M16 11v14" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function SparkIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <path
        d="M16 5l1.8 7.2L25 14l-7.2 1.8L16 23l-1.8-7.2L7 14l7.2-1.8L16 5z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M24 6v4M26 8h-4M8 22v3M9.5 23.5h-3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <rect x="7" y="14" width="18" height="13" rx="3" stroke={color} strokeWidth="2" />
      <path d="M11 14V11a5 5 0 0 1 10 0v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="20.5" r="1.5" fill={color} />
    </svg>
  );
}

export function StoryShowcase() {
  const [active, setActive] = useState(0);
  const slide = SLIDES[active];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [active]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="relative overflow-hidden rounded-[28px] bg-sky-100 shadow-[0_18px_40px_rgba(47,74,95,0.12)]">
        <div className="relative aspect-[16/10] bg-[#dbeafe] sm:aspect-[16/8]">
          <AppImage
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            fill
            className={
              slide.fit === "contain"
                ? "object-contain object-center"
                : "object-cover object-center"
            }
            sizes="(max-width: 1152px) 100vw, 1152px"
            priority={active === 0}
          />
          {slide.fit === "cover" ? (
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
          ) : null}
          <p className="absolute bottom-3 left-3 right-3 max-w-[min(100%,22rem)] rounded-2xl bg-white/95 px-4 py-3 text-sm leading-relaxed text-stone-700 shadow-sm sm:bottom-6 sm:left-auto sm:right-6 sm:text-base">
            {slide.quote}
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="이야기 장면">
        {SLIDES.map((item, index) => (
          <button
            key={item.src}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={`${index + 1}번째 장면`}
            onClick={() => setActive(index)}
            className={`h-2.5 rounded-full transition ${
              index === active ? "w-6 bg-[#E07A5F]" : "w-2.5 bg-stone-300 hover:bg-stone-400"
            }`}
          />
        ))}
      </div>

      <div className="mt-6 rounded-[24px] bg-white px-4 py-5 shadow-sm ring-1 ring-sky-100 sm:px-6">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <li key={item.title} className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${item.color}18` }}
              >
                <item.icon color={item.color} />
              </span>
              <p className="text-sm font-medium leading-snug text-stone-700">
                {item.title}
                <span className="mt-0.5 block text-stone-500">{item.subtitle}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
