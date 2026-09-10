"use client";

import { useEffect } from "react";

export default function PreviewError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      reset();
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [reset]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#eaf4fb] px-6 text-center">
      <p className="text-base font-semibold text-stone-800">
        미리보기를 다시 불러오는 중이에요
      </p>
      <p className="max-w-sm text-sm text-stone-500">
        그림은 계속 만들어지고 있어요. 잠시 후 자동으로 다시 열립니다.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-2 rounded-full bg-stone-800 px-4 py-2 text-sm text-white"
      >
        다시 시도
      </button>
    </div>
  );
}
