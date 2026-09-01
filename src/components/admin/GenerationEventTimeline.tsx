import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatTime(value: Date) {
  return value.toLocaleString("ko-KR", {
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

export function GenerationEventTimeline({
  events,
  title = "생성 로그",
  showEntityLink = true,
}: {
  events: Array<{
    id: string;
    kind: string;
    entityId: string;
    orderId: string | null;
    step: string;
    message: string | null;
    detail: unknown;
    createdAt: Date;
  }>;
  title?: string;
  showEntityLink?: boolean;
}) {
  if (events.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
        <p className="mt-2 text-sm text-stone-500">아직 기록된 생성 로그가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
        <Link
          href="/admin/generation-logs"
          className="text-xs font-medium text-sky-600 hover:underline"
        >
          전체 로그 보기
        </Link>
      </div>
      <ol className="mt-3 space-y-2">
        {events.map((event) => {
          const detail = formatDetail(event.detail);
          return (
            <li
              key={event.id}
              className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <time className="tabular-nums text-xs text-stone-500">
                  {formatTime(event.createdAt)}
                </time>
                <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-stone-600 ring-1 ring-stone-200">
                  {event.kind}
                </span>
                <code className="text-xs text-stone-700">{event.step}</code>
              </div>
              {event.message ? (
                <p className="mt-1 text-stone-800">{event.message}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                {showEntityLink && event.orderId ? (
                  <span>
                    order{" "}
                    <Link
                      href={`/admin/generation-logs?orderId=${encodeURIComponent(event.orderId)}`}
                      className="font-mono text-sky-600 hover:underline"
                    >
                      {event.orderId}
                    </Link>
                  </span>
                ) : null}
                <span className="font-mono">entity {event.entityId}</span>
              </div>
              {detail ? (
                <pre className="mt-1 overflow-x-auto text-[11px] text-stone-600">
                  {detail}
                </pre>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export async function loadGenerationEvents(options: {
  orderId?: string;
  entityId?: string;
  kind?: string;
  limit?: number;
}) {
  const limit = options.limit ?? 80;
  return prisma.generationEvent.findMany({
    where: {
      ...(options.orderId ? { orderId: options.orderId } : {}),
      ...(options.entityId ? { entityId: options.entityId } : {}),
      ...(options.kind ? { kind: options.kind } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
