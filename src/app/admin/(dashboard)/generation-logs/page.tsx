import Link from "next/link";
import { LiveGenerationLog } from "@/components/admin/LiveGenerationLog";

export default async function AdminGenerationLogsPage({
  searchParams,
}: {
  searchParams: { orderId?: string; entityId?: string; kind?: string };
}) {
  const orderId = searchParams.orderId?.trim() || undefined;
  const entityId = searchParams.entityId?.trim() || undefined;
  const kind = searchParams.kind?.trim() || undefined;

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin"
        className="text-sm text-stone-500 hover:text-stone-800"
      >
        ← 관리자 홈
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">생성 로그</h1>
      <p className="mt-1 text-sm text-stone-500">
        ComfyUI 터미널처럼, 누가 동화·스티커·캐릭터 생성을 눌렀는지 단계별로
        실시간 확인합니다. Supabase{" "}
        <code className="rounded bg-stone-100 px-1">generation_events</code>와
        동일합니다.
      </p>

      <form
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 ring-1 ring-stone-200"
        action="/admin/generation-logs"
        method="get"
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          order_id
          <input
            name="orderId"
            value={orderId ?? ""}
            placeholder="StorybookOrder / StickerOrder id"
            className="h-9 min-w-[220px] rounded-lg border border-stone-200 px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          entity_id
          <input
            name="entityId"
            value={entityId ?? ""}
            placeholder="illustration / character id"
            className="h-9 min-w-[220px] rounded-lg border border-stone-200 px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          kind
          <select
            name="kind"
            value={kind ?? ""}
            className="h-9 rounded-lg border border-stone-200 px-3 text-sm"
          >
            <option value="">전체</option>
            <option value="STORYBOOK_ORDER">STORYBOOK_ORDER</option>
            <option value="ILLUSTRATION">ILLUSTRATION</option>
            <option value="STICKER">STICKER</option>
            <option value="CHARACTER">CHARACTER</option>
          </select>
        </label>
        <button
          type="submit"
          className="h-9 rounded-lg bg-sky-400 px-4 text-sm font-medium text-white"
        >
          필터
        </button>
      </form>

      <div className="mt-4">
        <LiveGenerationLog orderId={orderId} entityId={entityId} kind={kind} />
      </div>

      <section className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-stone-700 ring-1 ring-amber-100">
        <p className="font-medium">멈춤 때 보는 법</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-stone-600">
          <li>
            <code>storybook.order_created</code>만 있고{" "}
            <code>illustration.enqueue_batch</code> 없음 → 생성 트리거 실패
          </li>
          <li>
            <code>illustration.openai_request</code> 후 <code>openai_done</code> 없음
            → OpenAI 대기/타임아웃
          </li>
          <li>
            <code>openai_done</code> 후 <code>upload_done</code> 없음 → 스토리지 업로드
            문제
          </li>
          <li>
            캐릭터: <code>character.requested</code> 후{" "}
            <code>complete_callback</code> 없음 → PC Comfy/ngrok 문제
          </li>
        </ul>
      </section>
    </div>
  );
}
