"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppImage } from "@/components/AppImage";
import { DeleteDraftOrderButton } from "@/components/DeleteDraftOrderButton";
import { GenerationProgress } from "@/components/GenerationProgress";
import { OrderPreviewPayButton } from "@/components/OrderPreviewPayButton";
import { PreviewWatermark } from "@/components/PreviewWatermark";
import type { PreviewBookPage } from "@/lib/preview-pages";
import { cn } from "@/lib/utils";

export function OrderPreviewBook({
  title,
  backHref,
  pages,
  paid,
  ready,
  bookComplete,
  orderId,
}: {
  title: string;
  backHref: string;
  pages: PreviewBookPage[];
  paid: boolean;
  ready: boolean;
  bookComplete: boolean;
  orderId: string;
}) {
  const [index, setIndex] = useState(0);
  const lastIndex = Math.max(pages.length - 1, 0);
  const safeIndex = Math.min(index, lastIndex);

  useEffect(() => {
    setIndex((current) => Math.min(current, lastIndex));
  }, [lastIndex]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(current + 1, lastIndex));
      }
      if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(current - 1, 0));
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lastIndex]);

  const completedCount = pages.filter(
    (page) => page.status === "COMPLETED" && page.imagePath,
  ).length;
  const showProgress = paid && !bookComplete;
  const useSkeleton = paid;
  const counterLabel = `${safeIndex + 1} / ${pages.length}`;

  return (
    <div className="flex min-h-dvh flex-col bg-[#eaf4fb] text-stone-800">
      <header className="sticky top-0 z-30 border-b border-sky-100/80 bg-[#eaf4fb]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:h-16 sm:px-4">
          <Link
            href={backHref}
            aria-label="뒤로가기"
            className="flex h-10 w-10 items-center justify-center rounded-full text-stone-600 hover:bg-white"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19 8 12l7-7"
              />
            </svg>
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold tracking-tight sm:text-lg">
            {title}
          </h1>
          {paid ? (
            <span className="h-10 w-10 shrink-0" aria-hidden />
          ) : (
            <DeleteDraftOrderButton
              orderId={orderId}
              title={title}
              redirectTo="/dashboard"
            />
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-40 pt-4 sm:px-4 sm:pt-6">
        {showProgress ? (
          <div className="mb-4 rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-sky-100 sm:px-6">
            <p className="text-base font-semibold text-stone-800">
              AI가 이야기를 그리고 있어요
            </p>
            <p className="mt-1 text-sm tabular-nums text-stone-500">
              {completedCount}/{pages.length} 페이지 완성
            </p>
            <div className="mx-auto mt-3 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-sky-400 transition-[width] duration-500"
                style={{
                  width: `${Math.max((completedCount / Math.max(pages.length, 1)) * 100, 4)}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-1 items-center justify-center">
          <article className="w-full max-w-md sm:max-w-lg">
            {pages.map((page, pageIndex) => (
              <div
                key={`${page.kind}-${page.pageNumber}-${page.id ?? pageIndex}`}
                hidden={pageIndex !== safeIndex}
              >
                <BookLeaf page={page} skeleton={useSkeleton} />
              </div>
            ))}
          </article>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-sky-100 bg-[#eaf4fb]/95 px-3 py-3 backdrop-blur sm:px-4">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIndex((current) => Math.max(current - 1, 0))}
              disabled={safeIndex === 0}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            <p className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums text-stone-600">
              {counterLabel}
            </p>
            <button
              type="button"
              onClick={() =>
                setIndex((current) => Math.min(current + 1, lastIndex))
              }
              disabled={safeIndex >= lastIndex}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음
            </button>
          </div>
          {paid ? (
            <Link
              href="/dashboard"
              className="flex h-12 items-center justify-center rounded-xl bg-sky-400 text-sm font-medium text-white hover:bg-sky-500"
            >
              대시보드로 돌아가기
            </Link>
          ) : (
            <OrderPreviewPayButton orderId={orderId} ready={ready} />
          )}
        </div>
      </footer>
    </div>
  );
}

function BookLeaf({
  page,
  skeleton = false,
}: {
  page: PreviewBookPage;
  skeleton?: boolean;
}) {
  const showImage = page.status === "COMPLETED" && page.imagePath;

  return (
    <figure className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sky-100">
      <div
        className="no-image-save relative aspect-[3/4] bg-stone-100"
        onContextMenu={(event) => event.preventDefault()}
      >
        {showImage && page.imagePath ? (
          <AppImage
            src={page.imagePath}
            alt={page.kind === "cover" ? "표지" : `${page.label}페이지`}
            fill
            draggable={false}
            className="pointer-events-none object-cover"
            sizes="(max-width: 640px) 100vw, 32rem"
          />
        ) : page.status === "FAILED" ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
            <p className="text-sm font-medium text-red-600">생성 실패</p>
            <p className="text-xs text-stone-500">잠시 후 다시 시도해 주세요</p>
          </div>
        ) : skeleton ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-stone-100 via-stone-200/80 to-stone-100" />
            <p className="relative z-10 text-sm font-medium text-stone-500">
              {page.status === "PROCESSING" ? "그리는 중..." : "대기 중"}
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            {page.id ? (
              <GenerationProgress kind="illustration" id={page.id} />
            ) : (
              <p className="text-sm font-medium text-[#E07A5F]">생성 중...</p>
            )}
          </div>
        )}
        <PreviewWatermark />
        <div
          className="absolute inset-0 z-[1]"
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
        />
        <span
          className={cn(
            "absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm",
            page.kind === "cover"
              ? "bg-[#F6E7C1] text-[#8A5A12]"
              : "bg-white/90 text-stone-700",
          )}
        >
          {page.label}
        </span>
      </div>
    </figure>
  );
}
