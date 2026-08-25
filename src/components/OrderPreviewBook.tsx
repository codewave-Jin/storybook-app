"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppImage } from "@/components/AppImage";
import { GenerationProgress } from "@/components/GenerationProgress";
import { OrderPreviewPayButton } from "@/components/OrderPreviewPayButton";
import { OrderPreviewShareButton } from "@/components/OrderPreviewShareButton";
import { PreviewWatermark } from "@/components/PreviewWatermark";
import type { PreviewBookPage } from "@/lib/preview-pages";
import { cn } from "@/lib/utils";

export function OrderPreviewBook({
  title,
  backHref,
  pages,
  paid,
  ready,
  orderId,
}: {
  title: string;
  backHref: string;
  pages: PreviewBookPage[];
  paid: boolean;
  ready: boolean;
  orderId: string;
}) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [index, setIndex] = useState(0);
  const pageRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const lastIndex = isDesktop ? 1 : pages.length - 1;
  const safeIndex = Math.min(index, lastIndex);

  useEffect(() => {
    setIndex((current) => Math.min(current, lastIndex));
  }, [lastIndex]);

  useEffect(() => {
    if (isDesktop || paid) {
      return;
    }
    pageRefs.current[safeIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [safeIndex, isDesktop, paid]);

  useEffect(() => {
    if (isDesktop || paid) {
      return;
    }

    const nodes = pageRefs.current.filter((node): node is HTMLElement =>
      Boolean(node),
    );
    if (nodes.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target) {
          return;
        }
        const nextIndex = nodes.findIndex((node) => node === visible.target);
        if (nextIndex >= 0) {
          setIndex(nextIndex);
        }
      },
      { threshold: 0.55 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [isDesktop, paid, pages.length]);

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

  const counterLabel = isDesktop
    ? safeIndex === 0
      ? "1 / 3"
      : "2–3 / 3"
    : `${safeIndex + 1} / ${pages.length}`;

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
          <OrderPreviewShareButton title={title} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-40 pt-4 sm:px-4 sm:pt-6">
        {paid ? (
          <PaidNotice />
        ) : (
          <>
            <div className="hidden md:flex md:flex-1 md:items-center md:justify-center">
              <Spread
                left={safeIndex === 0 ? null : pages[1]}
                right={safeIndex === 0 ? pages[0] : pages[2]}
                coverMode={safeIndex === 0}
              />
            </div>

            <div className="flex flex-col gap-5 md:hidden">
              {pages.map((page, pageIndex) => (
                <article
                  key={`${page.kind}-${page.pageNumber}-${page.id ?? pageIndex}`}
                  ref={(node) => {
                    pageRefs.current[pageIndex] = node;
                  }}
                  className="scroll-mt-20"
                >
                  <BookLeaf page={page} />
                </article>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-sky-100 bg-[#eaf4fb]/95 px-3 py-3 backdrop-blur sm:px-4">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2.5">
          {paid ? (
            <Link
              href="/dashboard"
              className="flex h-12 items-center justify-center rounded-xl bg-sky-400 text-sm font-medium text-white hover:bg-sky-500"
            >
              대시보드로 돌아가기
            </Link>
          ) : (
            <>
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
              <OrderPreviewPayButton orderId={orderId} ready={ready} />
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

function Spread({
  left,
  right,
  coverMode,
}: {
  left: PreviewBookPage | null;
  right: PreviewBookPage | null;
  coverMode: boolean;
}) {
  return (
    <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(47,74,95,0.12)] ring-1 ring-sky-100">
      <div className="w-1/2 border-r border-stone-200/80">
        {coverMode || !left ? <EmptyLeaf /> : <BookLeaf page={left} flush />}
      </div>
      <div className="w-1/2">
        {right ? <BookLeaf page={right} flush /> : <EmptyLeaf />}
      </div>
    </div>
  );
}

function EmptyLeaf() {
  return (
    <div className="aspect-[3/4] bg-gradient-to-b from-white to-[#F6E7C1]/50" />
  );
}

function BookLeaf({
  page,
  flush = false,
}: {
  page: PreviewBookPage;
  flush?: boolean;
}) {
  const showImage = page.status === "COMPLETED" && page.imagePath;

  return (
    <figure
      className={cn(
        "relative overflow-hidden bg-white",
        !flush && "rounded-2xl shadow-sm ring-1 ring-sky-100",
      )}
    >
      <div
        className="no-image-save relative aspect-[3/4] bg-stone-100"
        onContextMenu={(event) => event.preventDefault()}
      >
        {showImage ? (
          <AppImage
            src={page.imagePath}
            alt={page.kind === "cover" ? "표지" : `${page.label}페이지`}
            fill
            draggable={false}
            className="pointer-events-none object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : page.status === "FAILED" ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
            <p className="text-sm font-medium text-red-600">생성 실패</p>
            <p className="text-xs text-stone-500">잠시 후 다시 시도해 주세요</p>
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

function PaidNotice() {
  return (
    <div className="mx-auto mt-8 max-w-lg rounded-3xl bg-[#FDE8E0] px-6 py-12 text-center ring-1 ring-[#E07A5F]/20 sm:px-10">
      <p className="text-xl font-semibold text-stone-800">
        관리자가 나머지 페이지를 제작 중입니다
      </p>
      <p className="mt-3 text-sm text-[#E07A5F]">
        결제가 완료되었어요. 나머지 장면은 관리자가 이어서 그려요.
      </p>
    </div>
  );
}
