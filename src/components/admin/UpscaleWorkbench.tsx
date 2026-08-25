"use client";

import { AppImage } from "@/components/AppImage";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { copyOriginalToUpscaled } from "@/app/actions/illustrations";
import { cn } from "@/lib/utils";

export type UpscaleItem = {
  id: string;
  pageNumber: number;
  imagePath: string;
  upscaledImagePath: string | null;
};

async function downloadSelectedZip(orderId: string, ids: string[]) {
  const response = await fetch(
    `/api/admin/orders/${orderId}/download-upscaled-zip`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "다운로드에 실패했습니다.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${orderId}_업스케일.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function UpscaleWorkbench({
  orderId,
  items,
}: {
  orderId: string;
  items: UpscaleItem[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allIds = useMemo(() => items.map((item) => item.id), [items]);

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function runBatchUpscale() {
    const targets = items.filter((item) => selectedIds.includes(item.id));
    if (targets.length === 0) {
      setError("업스케일할 항목을 선택해 주세요.");
      return;
    }

    setError(null);
    startTransition(async () => {
      for (let index = 0; index < targets.length; index += 1) {
        const item = targets[index];
        setProcessingId(item.id);
        setProgress(`${index + 1}/${targets.length} 처리 중`);
        const result = await copyOriginalToUpscaled(item.id);
        if (result?.error) {
          setError(result.error);
          break;
        }
      }
      setProcessingId(null);
      setProgress(null);
      router.refresh();
    });
  }

  function runDownload() {
    const ids = items
      .filter(
        (item) => selectedIds.includes(item.id) && item.upscaledImagePath,
      )
      .map((item) => item.id);

    if (ids.length === 0) {
      setError("업스케일이 완료된 선택 항목이 없습니다.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await downloadSelectedZip(orderId, ids);
      } catch (downloadError) {
        setError(
          downloadError instanceof Error
            ? downloadError.message
            : "다운로드에 실패했습니다.",
        );
      }
    });
  }

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedIds(allIds)}
          className="h-10 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-50"
        >
          전체 선택
        </button>
        <button
          type="button"
          onClick={() => setSelectedIds([])}
          className="h-10 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-50"
        >
          선택 해제
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const selected = selectedIds.includes(item.id);
          const processing = processingId === item.id;

          return (
            <label
              key={item.id}
              className={cn(
                "cursor-pointer overflow-hidden rounded-2xl border bg-white",
                selected
                  ? "border-sky-400 ring-2 ring-sky-300"
                  : "border-stone-200",
              )}
            >
              <div className="flex items-center justify-between px-3 pt-3">
                <span className="text-sm font-medium">
                  {item.pageNumber}페이지
                </span>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(item.id)}
                  className="h-4 w-4 accent-sky-400"
                />
              </div>
              <div className="relative mt-2 aspect-[4/5] bg-stone-100">
                <AppImage
                  src={item.imagePath}
                  alt={`${item.pageNumber}페이지 원본`}
                  fill
                  className="object-cover"
                  sizes="240px"
                />
                {processing ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-medium">
                    업스케일 중...
                  </div>
                ) : null}
              </div>
              {item.upscaledImagePath ? (
                <div className="p-3">
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    업스케일 완료
                  </span>
                  <div className="relative mt-2 aspect-[4/5] overflow-hidden rounded-lg bg-stone-100">
                    <AppImage
                      src={item.upscaledImagePath}
                      alt={`${item.pageNumber}페이지 업스케일`}
                      fill
                      className="object-cover"
                      sizes="240px"
                    />
                  </div>
                </div>
              ) : (
                <p className="p-3 text-xs text-stone-400">원본만 있습니다</p>
              )}
            </label>
          );
        })}
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-8 flex flex-col gap-3 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
        <button
          type="button"
          disabled={isPending}
          onClick={runBatchUpscale}
          className="h-12 w-full rounded-xl bg-sky-400 px-5 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
        >
          선택한 항목 일괄 업스케일
        </button>
        <button
          type="button"
          disabled
          onClick={runDownload}
          title="업스케일 워크플로우 연동 후 활성화됩니다"
          className="h-12 w-full cursor-not-allowed rounded-xl border border-stone-200 bg-stone-100 px-5 text-sm font-medium text-stone-400 sm:w-auto"
        >
          선택 항목 업스케일본 다운로드
        </button>
        {progress ? (
          <span className="text-sm font-medium text-stone-600">{progress}</span>
        ) : null}
      </div>
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
