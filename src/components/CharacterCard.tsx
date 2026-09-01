"use client";

import type { Character } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppImage } from "@/components/AppImage";
import { DeleteCharacterButton } from "@/components/DeleteCharacterButton";
import { PreviewWatermark } from "@/components/PreviewWatermark";

function StatusLabel({ status }: { status: Character["status"] }) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 sm:px-2 sm:text-[11px]">
        완성
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 sm:px-2 sm:text-[11px]">
        실패
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FDE8E0] px-1.5 py-0.5 text-[10px] font-medium text-[#E07A5F] sm:px-2 sm:text-[11px]">
      <span className="inline-block h-2 w-2 animate-spin rounded-full border border-[#E07A5F] border-t-transparent sm:h-2.5 sm:w-2.5" />
      생성 중
    </span>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-white/80 border-t-[#E07A5F] sm:h-8 sm:w-8"
    />
  );
}

export function CharacterCard({ character }: { character: Character }) {
  const [open, setOpen] = useState(false);
  const isGenerating =
    character.status === "PENDING" || character.status === "PROCESSING";
  const completedImage =
    character.status === "COMPLETED" && character.generatedImagePath
      ? character.generatedImagePath
      : null;
  const previewImage = completedImage ?? character.originalPhotoPath;
  const canZoom = Boolean(previewImage) && !isGenerating;

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <article className="flex flex-col gap-1 sm:gap-2">
      <div className="no-image-save relative aspect-square overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-stone-200 sm:rounded-2xl">
        {canZoom ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute inset-0 z-[1] cursor-zoom-in"
            aria-label={`${character.label} 크게 보기`}
          />
        ) : null}

        {previewImage ? (
          <AppImage
            src={previewImage}
            alt={character.label}
            fill
            draggable={false}
            className="pointer-events-none object-cover"
            sizes="(max-width: 640px) 25vw, (max-width: 1024px) 20vw, 16vw"
          />
        ) : null}

        {previewImage && !isGenerating && character.status !== "FAILED" ? (
          <PreviewWatermark compact placement="bottom" />
        ) : null}

        {isGenerating ? (
          <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-1 bg-white/70 sm:gap-2">
            <Spinner />
            <span className="hidden text-sm font-medium text-[#E07A5F] sm:inline">
              생성 중
            </span>
          </div>
        ) : null}

        {character.status === "FAILED" ? (
          <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-1 bg-white/85 px-1 text-center sm:px-3">
            <span className="text-[10px] font-medium text-red-600 sm:text-sm">
              생성 실패
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-1 px-0.5">
        <div className="min-w-0">
          <h2 className="truncate text-[11px] font-semibold text-stone-800 sm:text-sm">
            {character.label}
          </h2>
          <div className="mt-0.5 sm:mt-1">
            <StatusLabel status={character.status} />
          </div>
        </div>
        <DeleteCharacterButton
          compact
          characterId={character.id}
          label={character.label}
        />
      </div>

      {open && previewImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 sm:p-8"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${character.label} 미리보기`}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="no-image-save relative aspect-square bg-stone-100"
              onContextMenu={(event) => event.preventDefault()}
            >
              <AppImage
                src={previewImage}
                alt={character.label}
                fill
                draggable={false}
                className="pointer-events-none object-contain"
                sizes="(max-width: 640px) 100vw, 32rem"
              />
              <PreviewWatermark placement="bottom" />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-stone-800">
                  {character.label}
                </p>
                <p className="text-xs text-stone-500">미리보기</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 shrink-0 rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function AddCharacterSlot({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-sky-300 bg-white/70 text-sky-600 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 sm:gap-2 sm:rounded-2xl"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F6E7C1] text-base font-semibold text-[#8A5A12] sm:h-10 sm:w-10 sm:text-xl">
        +
      </span>
      <span className="text-[10px] font-medium sm:text-sm">추가</span>
    </Link>
  );
}
