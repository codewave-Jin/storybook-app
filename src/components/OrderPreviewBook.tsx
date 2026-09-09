"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { IllustrationStatus } from "@prisma/client";
import { AppImage } from "@/components/AppImage";
import { DeleteDraftOrderButton } from "@/components/DeleteDraftOrderButton";
import { GenerationProgress } from "@/components/GenerationProgress";
import { OrderPreviewPayButton } from "@/components/OrderPreviewPayButton";
import { PreviewWatermark } from "@/components/PreviewWatermark";
import type { OrderOptionLine } from "@/lib/storybook-order-summary";
import type { PreviewBookPage } from "@/lib/preview-pages";

type OrderStatusPayload = {
  illustrations?: Array<{
    id: string;
    status: string;
    pageNumber?: number | null;
    imagePath?: string | null;
    imageUrl?: string | null;
  }>;
};

function isIllustrationStatus(value: string): value is IllustrationStatus {
  return (
    value === "IDLE" ||
    value === "PROCESSING" ||
    value === "COMPLETED" ||
    value === "FAILED"
  );
}

function isPendingPage(page: PreviewBookPage) {
  return !page.id || page.status === "IDLE" || page.status === "PROCESSING";
}

function mergeLivePages(
  current: PreviewBookPage[],
  payload: OrderStatusPayload,
): PreviewBookPage[] {
  const byId = new Map(
    (payload.illustrations ?? []).map((item) => [item.id, item]),
  );

  return current.map((page) => {
    if (!page.id) {
      return page;
    }
    const live = byId.get(page.id);
    if (!live) {
      return page;
    }
    return {
      ...page,
      status: isIllustrationStatus(live.status) ? live.status : page.status,
      imagePath: live.imageUrl ?? live.imagePath ?? page.imagePath,
    };
  });
}

export function OrderPreviewBook({
  title,
  backHref,
  pages,
  paid,
  ready,
  bookComplete,
  orderId,
  includePhotoAlbum = false,
  optionLines = [],
  defaultEmail,
  defaultName,
}: {
  title: string;
  backHref: string;
  pages: PreviewBookPage[];
  paid: boolean;
  ready: boolean;
  bookComplete: boolean;
  orderId: string;
  includePhotoAlbum?: boolean;
  optionLines?: OrderOptionLine[];
  defaultEmail?: string;
  defaultName?: string;
}) {
  const [index, setIndex] = useState(0);
  const [livePages, setLivePages] = useState(pages);
  const lastIndex = Math.max(livePages.length - 1, 0);
  const safeIndex = Math.min(index, lastIndex);
  const waitingForGeneration = livePages.some(isPendingPage);

  useEffect(() => {
    setLivePages((current) =>
      pages.map((serverPage, index) => {
        const live =
          current.find((page) => page.id && page.id === serverPage.id) ??
          current[index];
        if (
          live &&
          live.status === "COMPLETED" &&
          live.imagePath &&
          serverPage.status !== "COMPLETED"
        ) {
          return { ...serverPage, status: live.status, imagePath: live.imagePath };
        }
        return serverPage;
      }),
    );
  }, [pages]);

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

  useEffect(() => {
    if (!waitingForGeneration) {
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok || cancelled) {
          return;
        }
        const payload = (await response.json()) as OrderStatusPayload;
        if (cancelled) {
          return;
        }
        setLivePages((current) => mergeLivePages(current, payload));
      } catch {
        // Next interval retries.
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
  }, [orderId, waitingForGeneration]);

  const liveComplete = livePages.every(
    (page) => page.id && page.status === "COMPLETED" && page.imagePath,
  );
  const counterLabel = `${safeIndex + 1} / ${livePages.length}`;
  const payReady = ready || bookComplete || (!paid && liveComplete);

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

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-48 pt-4 sm:px-4 sm:pt-6">
        {optionLines.length > 0 ? (
          <section
            aria-label="선택한 옵션"
            className="mb-4 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-sky-100 sm:px-5"
          >
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {optionLines.map((line) => (
                <li
                  key={line.label}
                  className="flex min-w-0 items-baseline gap-1.5"
                >
                  <span className="shrink-0 text-xs text-stone-400">
                    {line.label}
                  </span>
                  <span className="text-sm font-medium text-stone-800">
                    {line.value}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="flex flex-1 items-center justify-center">
          <article className="w-full max-w-2xl sm:max-w-3xl">
            {livePages.map((page, pageIndex) => (
              <div
                key={`${page.kind}-${page.pageNumber}-${page.id ?? pageIndex}`}
                hidden={pageIndex !== safeIndex}
              >
                <BookLeaf
                  page={page}
                  onLiveChange={(next) => {
                    setLivePages((current) =>
                      current.map((item) =>
                        item.id && item.id === page.id
                          ? {
                              ...item,
                              status: next.status ?? item.status,
                              imagePath: next.imagePath ?? item.imagePath,
                            }
                          : item,
                      ),
                    );
                  }}
                />
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
            liveComplete && includePhotoAlbum && safeIndex === lastIndex ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={`/dashboard/orders/${orderId}/album`}
                  className="flex h-12 items-center justify-center rounded-xl bg-[#E07A5F] text-sm font-semibold text-white hover:bg-[#d56c51]"
                >
                  사진첩 진행하기
                </Link>
                <Link
                  href="/dashboard"
                  className="flex h-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  대시보드로 돌아가기
                </Link>
              </div>
            ) : (
              <Link
                href="/dashboard"
                className="flex h-12 items-center justify-center rounded-xl bg-sky-400 text-sm font-medium text-white hover:bg-sky-500"
              >
                대시보드로 돌아가기
              </Link>
            )
          ) : (
            <OrderPreviewPayButton
              orderId={orderId}
              ready={payReady}
              optionLines={optionLines}
              defaultEmail={defaultEmail}
              defaultName={defaultName}
            />
          )}
        </div>
      </footer>
    </div>
  );
}

function BookLeaf({
  page,
  onLiveChange,
}: {
  page: PreviewBookPage;
  onLiveChange: (next: {
    status?: IllustrationStatus;
    imagePath?: string | null;
  }) => void;
}) {
  if (page.kind === "cover") {
    return <CoverSpread page={page} onLiveChange={onLiveChange} />;
  }

  const showImage = page.status === "COMPLETED" && page.imagePath;

  return (
    <figure className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sky-100">
      <div
        className="no-image-save relative aspect-[2/1] bg-stone-100"
        onContextMenu={(event) => event.preventDefault()}
      >
        {showImage && page.imagePath ? (
          <AppImage
            src={page.imagePath}
            alt={`${page.label}페이지`}
            fill
            draggable={false}
            className="pointer-events-none object-contain"
            sizes="(max-width: 640px) 100vw, 32rem"
          />
        ) : page.status === "FAILED" ? (
          <FailedLeaf />
        ) : (
          <GeneratingLeaf page={page} onLiveChange={onLiveChange} />
        )}
        <PreviewWatermark />
        <div
          className="absolute inset-0 z-[1]"
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
        />
        <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-sm">
          {page.label}
        </span>
      </div>
    </figure>
  );
}

function CoverSpread({
  page,
  onLiveChange,
}: {
  page: PreviewBookPage;
  onLiveChange: (next: {
    status?: IllustrationStatus;
    imagePath?: string | null;
  }) => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const showImage = page.status === "COMPLETED" && page.imagePath;

  useEffect(() => {
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  return (
    <figure className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sky-100">
      <div className="no-image-save relative aspect-[2/1] bg-stone-100">
        <div className="absolute inset-0 grid grid-cols-2">
          <div className="relative flex items-center justify-center bg-[#f3eee6]">
            <label className="relative z-10 flex aspect-[3/4] w-[56%] max-h-[78%] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2px] bg-white p-[7px] shadow-[0_2px_10px_rgba(0,0,0,0.12)] ring-1 ring-stone-400/70">
              <span className="relative flex h-full w-full items-center justify-center overflow-hidden bg-stone-100">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="표지 왼쪽 사진"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="px-2 text-center">
                    <span className="block text-sm font-medium text-stone-600">
                      사진 추가
                    </span>
                    <span className="mt-0.5 block text-[11px] text-stone-400">
                      액자에 넣을 사진을 골라 주세요
                    </span>
                  </span>
                )}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  const nextUrl = URL.createObjectURL(file);
                  setPhotoUrl((current) => {
                    if (current) {
                      URL.revokeObjectURL(current);
                    }
                    return nextUrl;
                  });
                }}
              />
            </label>
          </div>
          <div className="relative bg-stone-100">
            {showImage && page.imagePath ? (
              <AppImage
                src={page.imagePath}
                alt="표지"
                fill
                draggable={false}
                className="pointer-events-none object-cover"
                sizes="(max-width: 640px) 50vw, 16rem"
              />
            ) : page.status === "FAILED" ? (
              <FailedLeaf />
            ) : (
              <GeneratingLeaf page={page} onLiveChange={onLiveChange} />
            )}
            <PreviewWatermark />
            <div
              className="absolute inset-0 z-[1]"
              onContextMenu={(event) => event.preventDefault()}
              onDragStart={(event) => event.preventDefault()}
            />
            <span className="absolute right-3 top-3 z-10 rounded-full bg-[#F6E7C1] px-2.5 py-1 text-[11px] font-semibold text-[#8A5A12] shadow-sm">
              표지
            </span>
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px bg-stone-300/80"
        />
      </div>
    </figure>
  );
}

function FailedLeaf() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
      <p className="text-sm font-medium text-red-600">생성 실패</p>
      <p className="text-xs text-stone-500">잠시 후 다시 시도해 주세요</p>
    </div>
  );
}

function GeneratingLeaf({
  page,
  onLiveChange,
}: {
  page: PreviewBookPage;
  onLiveChange: (next: {
    status?: IllustrationStatus;
    imagePath?: string | null;
  }) => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-stone-100 via-stone-200/80 to-stone-100" />
      {page.id ? (
        <div className="relative z-10">
          <GenerationProgress
            kind="illustration"
            id={page.id}
            onSnapshot={(snapshot) => {
              const status = snapshot.status;
              if (status && isIllustrationStatus(status)) {
                onLiveChange({
                  status,
                  imagePath: snapshot.imageUrl,
                });
              } else if (snapshot.imageUrl) {
                onLiveChange({ imagePath: snapshot.imageUrl });
              }
            }}
          />
        </div>
      ) : (
        <p className="relative z-10 text-sm font-medium text-stone-500">
          대기 중
        </p>
      )}
    </div>
  );
}
