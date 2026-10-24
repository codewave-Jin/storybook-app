"use client";

import { AppImage } from "@/components/AppImage";
import { stickerSheetCells } from "@/lib/sticker-sheet";

function StickerFace({
  src,
  phrase,
  overlayPhrase,
  compact = false,
}: {
  src: string;
  phrase: string;
  overlayPhrase: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-full bg-white ${
        compact
          ? "shadow-[0_0_0_1px_#fde68a,0_0_0_3px_#fdba74]"
          : "shadow-[0_0_0_3px_#fde68a,0_0_0_8px_#fdba74]"
      }`}
    >
      <AppImage
        src={src}
        alt={phrase}
        fill
        draggable={false}
        className="pointer-events-none object-cover"
        sizes={compact ? "80px" : "(max-width: 640px) 70vw, 20rem"}
      />
      {overlayPhrase ? (
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent text-center ${
            compact ? "px-1 pb-1.5 pt-3" : "px-3 pb-4 pt-8"
          }`}
        >
          <p
            className={`truncate font-semibold text-white drop-shadow ${
              compact ? "text-[7px] leading-tight" : "text-sm"
            }`}
          >
            {phrase}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function StickerPreviewViews({
  src,
  phrase,
  quantity,
  sizeLabel,
  overlayPhrase,
  variant = "full",
}: {
  src: string;
  phrase: string;
  quantity: number;
  sizeLabel?: string;
  overlayPhrase: boolean;
  showWatermark?: boolean;
  variant?: "full" | "a4";
}) {
  const cells = stickerSheetCells(sizeLabel ?? "", quantity);

  return (
    <div className="space-y-5">
      {variant === "full" ? (
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <p className="text-sm font-semibold text-stone-800">스티커 모양</p>
        <p className="mt-1 text-xs text-stone-500">
          원형 스티커로 잘렸을 때 모습이에요.
        </p>
        <div
          className="no-image-save relative mx-auto mt-5 w-[70%] max-w-[16rem]"
          onContextMenu={(event) => event.preventDefault()}
        >
          <StickerFace
            src={src}
            phrase={phrase}
            overlayPhrase={overlayPhrase}
          />
        </div>
      </section>
      ) : null}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <p className="text-sm font-semibold text-stone-800">A4 배치</p>
        <p className="mt-1 text-xs text-stone-500">
          A4 한 장에 {quantity}개가 이렇게 들어가요.
        </p>
        <div
          className="no-image-save relative mx-auto mt-4 w-full max-w-md overflow-hidden rounded-xl bg-[#f7f4ef] shadow-sm ring-1 ring-stone-200"
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="relative aspect-[210/297]">
            {cells.map((cell, index) => (
              <div
                key={`${cell.leftPct}-${cell.topPct}-${index}`}
                className="absolute"
                style={{
                  left: `${cell.leftPct}%`,
                  top: `${cell.topPct}%`,
                  width: `${cell.widthPct}%`,
                  height: `${cell.heightPct}%`,
                }}
              >
                <StickerFace
                  src={src}
                  phrase={phrase}
                  overlayPhrase={overlayPhrase}
                  compact
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
