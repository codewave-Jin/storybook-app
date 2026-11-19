"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Device = "ipad" | "android";

const STEPS: Record<Device, { title: string; desc: string; icon: string }[]> = {
  ipad: [
    { title: "사파리로 그림책 열기", desc: "‘태블릿에서 열기’를 누르고 시작 화면이 뜰 때까지 기다려요", icon: "M4 5h16v11H4zM8 20h8" },
    { title: "공유 버튼 누르기", desc: "사파리 주소창 옆, 네모에 화살표가 있는 버튼", icon: "M12 3v12M8 7l4-4 4 4M5 12v8h14v-8" },
    { title: "홈 화면에 추가", desc: "메뉴를 아래로 내려 ‘홈 화면에 추가’ → 오른쪽 위 ‘추가’를 눌러요", icon: "M12 5v14M5 12h14" },
  ],
  android: [
    { title: "크롬으로 그림책 열기", desc: "‘태블릿에서 열기’를 누르고 시작 화면이 뜰 때까지 기다려요", icon: "M4 5h16v11H4zM8 20h8" },
    { title: "다운로드 누르기", desc: "시작 화면 오른쪽 위 ‘다운로드’ 버튼을 눌러요", icon: "M12 4v11M8 11l4 4 4-4M5 20h14" },
    { title: "또는 메뉴에서 설치", desc: "버튼이 없으면 크롬 오른쪽 위 ⋮ → ‘앱 설치’ 또는 ‘홈 화면에 추가’", icon: "M12 5h.01M12 12h.01M12 19h.01" },
  ],
};

/** 단어 그림책 완성 단계: "홈 화면 추가 방법" 안내 창 */
export function WordbookInstallGuideButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<Device>("ipad");

  useEffect(() => {
    if (/android/i.test(navigator.userAgent)) setDevice("android");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-12 items-center rounded-full border border-sky-200 bg-white px-5 text-sm font-medium text-stone-700 hover:bg-sky-50",
          className,
        )}
      >
        홈 화면 추가 방법
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="홈 화면에 추가하기"
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-800">홈 화면에 추가하기</h2>
                <p className="mt-1 text-sm text-stone-500">앱처럼 아이콘을 눌러 바로 열 수 있어요.</p>
              </div>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div role="tablist" className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-sky-50 p-1">
              {(["ipad", "android"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={device === key}
                  onClick={() => setDevice(key)}
                  className={cn(
                    "h-10 rounded-full text-sm font-medium",
                    device === key ? "bg-white text-stone-800 shadow-sm ring-1 ring-sky-100" : "text-stone-500",
                  )}
                >
                  {key === "ipad" ? "아이패드" : "안드로이드 태블릿"}
                </button>
              ))}
            </div>

            <ol className="mt-4 space-y-3">
              {STEPS[device].map((step, index) => (
                <li key={step.title} className="flex items-start gap-3 rounded-2xl bg-sky-50/60 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E07A5F] text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-stone-700 ring-1 ring-sky-100">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={step.icon} />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-stone-800">{step.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">{step.desc}</span>
                  </span>
                </li>
              ))}
            </ol>

            <p className="mt-4 flex gap-2 rounded-2xl bg-[#FDF8EA] p-3 text-xs leading-relaxed text-[#8A5A12]">
              <span aria-hidden="true">💡</span>
              <span>
                처음 한 번 열 때 그림과 소리를 내려받아요. 시작 화면에 ‘인터넷 없이도 볼 수 있어요’가 뜨면 그 뒤로는
                인터넷 없이도 볼 수 있어요. 와이파이에서 열어 주세요.
              </span>
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
