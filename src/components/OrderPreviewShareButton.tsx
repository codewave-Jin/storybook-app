"use client";

import { useEffect, useState } from "react";

export function OrderPreviewShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} · 스토리북`, url });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? "링크를 복사했어요" : "공유하기"}
      className="flex h-10 w-10 items-center justify-center rounded-full text-stone-600 hover:bg-white hover:text-stone-900"
    >
      {copied ? (
        <span className="text-[10px] font-medium text-[#E07A5F]">복사됨</span>
      ) : (
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v10m0-10 3.5 3.5M12 4 8.5 7.5"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 12.5v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5"
          />
        </svg>
      )}
    </button>
  );
}
