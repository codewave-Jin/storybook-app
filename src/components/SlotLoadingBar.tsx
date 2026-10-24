"use client";

import { useEffect, useState } from "react";
import { toProtectedMediaSrc } from "@/lib/media-paths";
import { cn } from "@/lib/utils";

export function useImageReady(src?: string | null) {
  const [readySrc, setReadySrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      return;
    }
    let cancelled = false;
    const probe = new window.Image();
    const resolved = toProtectedMediaSrc(src, "preview");
    const url = typeof resolved === "string" ? resolved : src;
    const markReady = () => {
      if (!cancelled) {
        setReadySrc(src);
      }
    };
    probe.onload = markReady;
    probe.onerror = markReady;
    probe.src = url;
    if (probe.complete && probe.naturalWidth > 0) {
      markReady();
    }
    return () => {
      cancelled = true;
    };
  }, [src]);

  return Boolean(src && readySrc === src);
}

export function SlotLoadingBar({
  label = "캐릭터 불러오는 중",
  compact = false,
  className,
}: {
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const [percent, setPercent] = useState(8);

  useEffect(() => {
    const started = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      setPercent(Math.min(90, Math.round(8 + elapsed * 3.2)));
    }, 300);
    return () => window.clearInterval(tick);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-1.5 px-2" : "gap-2 px-3",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <p
        className={cn(
          "font-semibold tabular-nums text-stone-700",
          compact ? "text-[11px]" : "text-sm",
        )}
      >
        {percent}%
      </p>
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-stone-200",
          compact ? "h-1.5 max-w-[5.5rem]" : "h-2 max-w-[8rem]",
        )}
      >
        <div
          className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
          style={{ width: `${Math.max(percent, 6)}%` }}
        />
      </div>
      <p className={cn("text-stone-500", compact ? "text-[10px]" : "text-xs")}>
        {label}
      </p>
    </div>
  );
}
