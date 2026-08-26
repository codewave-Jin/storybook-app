"use client";

import { useState } from "react";
import { HOME_MEDIA, type HomeMediaPair } from "@/components/home/media";
import { MediaSlot } from "@/components/home/MediaSlot";

function pairKind(id: string): "child" | "mom" | "dad" {
  if (id === "mom" || id === "dad") {
    return id;
  }
  return "child";
}

function ComparisonSlider({ pair }: { pair: HomeMediaPair }) {
  const [pos, setPos] = useState(52);
  const kind = pairKind(pair.id);

  return (
    <div className="relative overflow-hidden bg-sky-50">
      <div className="relative aspect-[4/5] w-full">
        <div className="absolute inset-0">
          <MediaSlot
            src={pair.after}
            alt={`${pair.caption} 캐릭터`}
            label={`${pair.caption} · 캐릭터`}
            kind={kind}
            tone="art"
            showLabel={false}
          />
        </div>
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          <MediaSlot
            src={pair.before}
            alt={`${pair.caption} 사진`}
            label={`${pair.caption} · 사진`}
            kind={kind}
            tone="photo"
            showLabel={false}
          />
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow-sm"
          style={{ left: `${pos}%` }}
        >
          <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs text-sky-500 shadow">
            ↔
          </span>
        </div>

        <input
          type="range"
          min={8}
          max={92}
          value={pos}
          onChange={(event) => setPos(Number(event.target.value))}
          aria-label="사진과 캐릭터 비교"
          className="absolute inset-0 z-10 cursor-ew-resize opacity-0"
        />
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-[11px] font-medium text-stone-600 sm:text-xs">
        <span>Before · 사진</span>
        <span>After · 캐릭터</span>
      </div>
    </div>
  );
}

export function BeforeAfterGallery() {
  const [active, setActive] = useState(0);
  const pair = HOME_MEDIA.heroPairs[active];

  return (
    <div className="mx-auto w-full max-w-[340px] sm:max-w-[380px] lg:ml-auto lg:mr-0 lg:max-w-[400px]">
      <div className="flex items-stretch gap-2 sm:gap-2.5">
        <div className="min-w-0 flex-1 rounded-[1.5rem] bg-stone-800 p-1.5 shadow-[0_14px_32px_rgba(47,74,95,0.16)] sm:rounded-[1.75rem] sm:p-2">
          <div className="mx-auto mb-1.5 hidden h-1 w-12 rounded-full bg-stone-600 sm:block" />
          <div className="overflow-hidden rounded-[1.15rem] bg-white sm:rounded-[1.35rem]">
            <ComparisonSlider pair={pair} />
          </div>
        </div>

        <div className="flex w-[64px] shrink-0 flex-col justify-start gap-2 pt-1 sm:w-[72px] sm:gap-2.5 sm:pt-2">
          {HOME_MEDIA.heroPairs.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(index)}
              className={`overflow-hidden rounded-xl ring-2 transition ${
                index === active
                  ? "ring-sky-400"
                  : "ring-transparent opacity-75 hover:opacity-100"
              }`}
              aria-label={`${item.caption} 예시 보기`}
              aria-pressed={index === active}
            >
              <div className="aspect-square">
                <MediaSlot
                  src={item.after}
                  alt={`${item.caption} 캐릭터 썸네일`}
                  label={item.caption}
                  kind={pairKind(item.id)}
                  tone="art"
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2.5 text-center text-[11px] text-stone-500 sm:text-xs">
        화면에서 먼저 만나요 · 인쇄/배송은 추후 안내
      </p>
    </div>
  );
}
