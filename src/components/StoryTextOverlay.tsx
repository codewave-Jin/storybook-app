import type { ReactNode } from "react";

export const STORY_PRINT_NOTICE =
  "텍스트는 인쇄 시 관리자가 적절하게 배치하여 인쇄를 진행합니다.";

export function StoryPrintNotice() {
  return (
    <p className="mt-1.5 text-center text-[11px] leading-snug text-stone-400 sm:text-xs">
      {STORY_PRINT_NOTICE}
    </p>
  );
}

export function StoryTextOverlay({
  lines,
  action,
}: {
  lines: string[];
  action?: ReactNode;
}) {
  if (lines.length === 0 && !action) {
    return null;
  }

  const compact = lines.length >= 8;

  return (
    <div className="relative border-t border-amber-900/10 bg-[#fff8ee] px-3 py-2 sm:px-5 sm:py-2.5">
      {action ? (
        <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-3.5">
          {action}
        </div>
      ) : null}
      {lines.length > 0 ? (
        <p
          className={`font-story whitespace-pre-line text-center leading-snug text-stone-800 ${
            compact ? "text-[13px] sm:text-sm" : "text-sm sm:text-base"
          }`}
        >
          {lines.join("\n")}
        </p>
      ) : null}
      <StoryPrintNotice />
    </div>
  );
}
