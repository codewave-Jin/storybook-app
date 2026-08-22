"use client";

import { useEffect, useState } from "react";

function estimatedPercent(elapsedSec: number) {
  return Math.min(90, Math.round(8 + elapsedSec * 2.2));
}

export function GenerationProgress({
  kind,
  id,
}: {
  kind: "character" | "illustration";
  id: string;
}) {
  const [percent, setPercent] = useState(8);
  const [label, setLabel] = useState("생성 중");

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function poll() {
      const elapsed = (Date.now() - startedAt) / 1000;
      const fallback = estimatedPercent(elapsed);

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
  }, [kind, id]);

  return (
    <div className="flex w-40 flex-col items-center gap-2 px-2 text-center">
      <span className="text-lg font-semibold tabular-nums text-stone-800">
        {percent}%
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-stone-800 transition-[width] duration-300"
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
      <span className="text-xs text-stone-500">{label}</span>
    </div>
  );
}
