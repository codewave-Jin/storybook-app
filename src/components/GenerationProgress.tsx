"use client";

import { useEffect, useState } from "react";

export type GenerationKind = "character" | "illustration" | "sticker";

function estimatedPercent(elapsedSec: number, kind: GenerationKind) {
  const rate = kind === "sticker" ? 0.5 : 2.2;
  return Math.min(90, Math.round(8 + elapsedSec * rate));
}

export function GenerationProgress({
  kind,
  id,
  compact = false,
  startedAt,
}: {
  kind: GenerationKind;
  id: string;
  compact?: boolean;
  startedAt?: number;
}) {
  const origin = startedAt ?? 0;
  const [percent, setPercent] = useState(() =>
    Math.max(8, estimatedPercent((Date.now() - (startedAt ?? Date.now())) / 1000, kind)),
  );
  const [label, setLabel] = useState("생성 중");

  useEffect(() => {
    let cancelled = false;
    const baseline = origin || Date.now();

    async function poll() {
      const elapsed = (Date.now() - baseline) / 1000;
      const fallback = estimatedPercent(elapsed, kind);

      try {
        const response = await fetch(
          `/api/generation-progress?kind=${kind}&id=${encodeURIComponent(id)}`,
          { cache: "no-store", credentials: "same-origin" },
        );
        if (cancelled) {
          return;
        }

        if (response.ok) {
          const payload = (await response.json()) as {
            percent?: number;
            label?: string | null;
            active?: boolean;
          };
          const finished = payload.active === false;
          const serverPercent =
            typeof payload.percent === "number" ? payload.percent : 0;
          setPercent((current) =>
            finished ? 100 : Math.max(current, fallback, serverPercent),
          );
          setLabel(finished ? "완료" : payload.label || "생성 중");
          return;
        }
      } catch {
        // Keep climbing locally if the progress API is briefly unavailable.
      }

      if (!cancelled) {
        setPercent((current) => Math.max(current, fallback));
      }
    }

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [kind, id, origin]);

  if (compact) {
    return (
      <div className="flex w-24 shrink-0 flex-col items-end gap-1">
        <span className="text-[11px] font-semibold tabular-nums text-[#E07A5F]">
          {percent}%
        </span>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-[#E07A5F] transition-[width] duration-300"
            style={{ width: `${Math.max(percent, 4)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-40 flex-col items-center gap-2 px-2 text-center">
      <span className="text-lg font-semibold tabular-nums text-stone-800">
        {percent}%
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
      <span className="text-xs text-stone-500">{label}</span>
    </div>
  );
}
