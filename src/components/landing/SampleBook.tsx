"use client";

import { useState } from "react";

const THEMES = [
  {
    id: "ocean",
    label: "바다 탐험",
    style: "수채화",
    src: "/landing/sample-ocean.png",
  },
  {
    id: "dog",
    label: "강아지",
    style: "수채화",
    src: "/landing/sample-dog.png",
  },
  {
    id: "rabbit",
    label: "토끼",
    style: "수채화",
    src: "/landing/sample-rabbit.png",
  },
  {
    id: "zoo",
    label: "동물원",
    style: "크레용",
    src: "/landing/sample-zoo.png",
  },
];

export function SampleBook() {
  const [active, setActive] = useState(0);
  const theme = THEMES[active];

  return (
    <div>
      <div className="overflow-hidden rounded-[28px] bg-sky-100">
        <img
          src={theme.src}
          alt={`${theme.label} ${theme.style} 샘플`}
          className="aspect-[16/10] w-full object-cover sm:aspect-[16/9]"
        />
      </div>

      <div className="mt-5 flex justify-center gap-2">
        {THEMES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`${index + 1}번째 미리보기`}
            onClick={() => setActive(index)}
            className={`h-2.5 w-2.5 rounded-full ${
              index === active ? "bg-sky-400" : "bg-stone-300"
            }`}
          />
        ))}
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {THEMES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(index)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm ${
              index === active
                ? "bg-sky-400 text-white"
                : "bg-white text-stone-600 ring-1 ring-stone-200"
            }`}
          >
            {item.label} {item.style}
          </button>
        ))}
      </div>
    </div>
  );
}
