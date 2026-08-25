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
      <div className="relative aspect-[4/5] w-full sm:aspect-[5/6]">
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
          <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm text-sky-500 shadow">
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
      <div className="flex items-center justify-between px-4 py-3 text-xs font-medium text-stone-600 sm:text-sm">
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
    <div>
      <div className="rounded-[2rem] bg-stone-800 p-2 shadow-[0_18px_40px_rgba(47,74,95,0.18)] sm:rounded-[2.2rem] sm:p-3">
        <div className="mx-auto mb-2 hidden h-1.5 w-16 rounded-full bg-stone-600 sm:block" />
        <div className="overflow-hidden rounded-[1.5rem] bg-white sm:rounded-[1.7rem]">
          <ComparisonSlider pair={pair} />
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-stone-500 sm:text-sm">
        화면에서 먼저 만나요 · 인쇄/배송은 추후 안내
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {HOME_MEDIA.heroPairs.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(index)}
            className={`overflow-hidden rounded-2xl ring-2 transition ${
              index === active
                ? "ring-sky-400"
                : "ring-transparent opacity-80 hover:opacity-100"
            }`}
            aria-label={`${item.caption} 예시 보기`}
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
  );
}
