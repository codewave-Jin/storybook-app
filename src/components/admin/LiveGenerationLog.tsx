"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type GenerationEventRow = {
  id: string;
  kind: string;
  entityId: string;
  orderId: string | null;
  step: string;
  message: string | null;
  detail: unknown;
  createdAt: string;
};

type ActiveJob = {
  kind: string;
  entityId: string;
  orderId: string | null;
  label: string;
  startedAt: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    hour12: false,
    timeZone: "Asia/Seoul",
  });
}

function formatDetail(detail: unknown) {
  if (!detail || typeof detail !== "object") {
    return null;
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return null;
  }
}

function terminalLine(event: GenerationEventRow) {
  const msg = event.message ? ` — ${event.message}` : "";
  return `[${formatTime(event.createdAt)}] ${event.kind} ${event.step}${msg}`;
}

export function LiveGenerationLog({
  orderId,
  entityId,
  kind,
}: {
  orderId?: string;
  entityId?: string;
  kind?: string;
}) {
  const [events, setEvents] = useState<GenerationEventRow[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [eventsTableReady, setEventsTableReady] = useState(true);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    const params = new URLSearchParams();
    if (orderId) params.set("orderId", orderId);
    if (entityId) params.set("entityId", entityId);
    if (kind) params.set("kind", kind);
    params.set("limit", "120");

    try {
      const response = await fetch(
        `/api/admin/generation-events?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as {
        events?: GenerationEventRow[];
        activeJobs?: ActiveJob[];
        eventsTableReady?: boolean;
      };
      setEventsTableReady(payload.eventsTableReady ?? true);
      setActiveJobs(payload.activeJobs ?? []);
      const rows = payload.events ?? [];
      setEvents(rows);
      setError(null);

      const hasNew = rows.some((row) => !seenIdsRef.current.has(row.id));
      rows.forEach((row) => seenIdsRef.current.add(row.id));
      if (hasNew && !paused) {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (pollError) {
      setError(
        pollError instanceof Error ? pollError.message : "로그를 불러오지 못했습니다.",
      );
    }
  }, [orderId, entityId, kind, paused]);

  useEffect(() => {
    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [poll]);

  const terminalEvents = [...events].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt),
  );

  return (
    <div className="space-y-4">
      {!eventsTableReady ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <code className="font-mono">generation_events</code> 테이블이 없습니다.
          Supabase SQL Editor에 마이그레이션 SQL을 실행해 주세요. (진행 중 작업은
          아래 DB 상태로만 표시됩니다.)
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100">
          로그 조회 실패: {error}
        </div>
      ) : null}

      <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-800">
            지금 진행 중 ({activeJobs.length})
          </h2>
          <span className="text-xs text-stone-500">2초마다 자동 갱신</span>
        </div>
        {activeJobs.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">
            GPT/Comfy 생성이 진행 중인 작업이 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {activeJobs.map((job) => (
              <li
                key={`${job.kind}-${job.entityId}`}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm"
              >
                <span
                  className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-sky-500"
                  aria-hidden
                />
                <span className="font-medium text-stone-800">{job.label}</span>
                <span className="rounded bg-white px-1.5 py-0.5 text-[11px] text-stone-600 ring-1 ring-stone-200">
                  {job.kind}
                </span>
                {job.orderId ? (
                  <Link
                    href={`/admin/generation-logs?orderId=${encodeURIComponent(job.orderId)}`}
                    className="font-mono text-xs text-sky-600 hover:underline"
                  >
                    {job.orderId}
                  </Link>
                ) : (
                  <span className="font-mono text-xs text-stone-500">
                    {job.entityId}
                  </span>
                )}
                <span className="text-xs text-stone-500">
                  시작 {formatTime(job.startedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl ring-1 ring-stone-700">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-700 bg-stone-900 px-4 py-2">
          <h2 className="text-sm font-medium text-stone-200">실시간 생성 로그</h2>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className="rounded-lg px-2 py-1 text-xs text-stone-300 hover:bg-stone-800"
          >
            {paused ? "자동 스크롤 켜기" : "자동 스크롤 끄기"}
          </button>
        </div>
        <div
          className="max-h-[min(60vh,520px)] overflow-y-auto bg-stone-950 px-4 py-3 font-mono text-xs leading-relaxed text-stone-300"
        >
          {terminalEvents.length === 0 ? (
            <p className="text-stone-500">
              아직 이벤트가 없습니다. 누군가 미리보기/생성을 누르면 여기에 쌓입니다.
            </p>
          ) : (
            terminalEvents.map((event) => {
              const detail = formatDetail(event.detail);
              return (
                <div key={event.id} className="mb-2 border-b border-stone-800 pb-2 last:border-0">
                  <div>{terminalLine(event)}</div>
                  {detail ? (
                    <div className="mt-0.5 text-[11px] text-stone-500">{detail}</div>
                  ) : null}
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>
      </section>
    </div>
  );
}
