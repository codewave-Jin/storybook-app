"use client";

import { useEffect, useRef, useState } from "react";
import { estimatedGenerationPercent } from "@/lib/generation-progress-estimate";

export type GenerationKind = "character" | "illustration" | "sticker";

export type GenerationProgressSnapshot = {
  percent: number;
  label: string;
  active: boolean;
  status?: string;
  imageUrl?: string | null;
  queueStatus?: "QUEUED" | "RUNNING" | null;
  queueAhead?: number;
};

function estimatedPercent(elapsedSec: number, kind: GenerationKind) {
  return estimatedGenerationPercent(elapsedSec, kind);
}

export function GenerationProgress({
  kind,
  id,
  compact = false,
  startedAt,
  onSnapshot,
}: {
  kind: GenerationKind;
  id: string;
  compact?: boolean;
  startedAt?: number;
  onSnapshot?: (snapshot: GenerationProgressSnapshot) => void;
}) {
  const origin = startedAt ?? 0;
  const [percent, setPercent] = useState(() =>
    Math.max(8, estimatedPercent((Date.now() - (startedAt ?? Date.now())) / 1000, kind)),
  );
  const [label, setLabel] = useState("생성 중");
  const onSnapshotRef = useRef(onSnapshot);
  const queuedRef = useRef(false);
  const finishedRef = useRef(false);
  onSnapshotRef.current = onSnapshot;

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
            status?: string;
            imageUrl?: string | null;
            queueStatus?: "QUEUED" | "RUNNING" | null;
            queueAhead?: number;
          };
          const finished = payload.active === false;
          const queued = payload.queueStatus === "QUEUED";
          const serverPercent =
            typeof payload.percent === "number" ? payload.percent : 0;
          const completed =
            finished &&
            (serverPercent >= 100 || payload.label === "완료");
          const failed = finished && payload.label === "실패";
          queuedRef.current = queued && !finished;
          finishedRef.current = completed || failed;
          const nextPercent = completed
            ? 100
            : queued
              ? Math.min(Math.max(serverPercent, 8), 12)
              : Math.max(
                  estimatedPercent(elapsed, kind),
                  serverPercent,
                );
          const nextLabel = completed
            ? "완료"
            : failed
              ? "실패"
              : payload.label || "생성 중";
          setPercent((current) => {
            if (completed) return 100;
            if (queued) return nextPercent;
            return Math.max(current, nextPercent);
          });
          setLabel(nextLabel);
          onSnapshotRef.current?.({
            percent: completed
              ? 100
              : queued
                ? nextPercent
                : Math.max(serverPercent, nextPercent),
            label: nextLabel,
            active: payload.active !== false,
            status: payload.status,
            imageUrl: payload.imageUrl ?? null,
            queueStatus: payload.queueStatus ?? null,
            queueAhead: payload.queueAhead ?? 0,
          });
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
    }, 2000);
    const tick = window.setInterval(() => {
      if (finishedRef.current || queuedRef.current) {
        return;
      }
      const elapsed = (Date.now() - baseline) / 1000;
      const fallback = estimatedPercent(elapsed, kind);
      setPercent((current) => {
        if (current >= 100) return current;
        return Math.min(90, Math.max(current, fallback));
      });
    }, 400);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearInterval(tick);
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
    <div className="flex w-52 flex-col items-center gap-2 px-2 text-center">
      <span className="text-lg font-semibold tabular-nums text-stone-800">
        {percent}%
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
      {kind === "illustration" || kind === "sticker" ? (
        <p className="text-[11px] leading-snug text-stone-500">
          2~3분 정도 걸릴 수 있어요
        </p>
      ) : null}
      <span className="text-xs text-stone-500">{label}</span>
    </div>
  );
}
