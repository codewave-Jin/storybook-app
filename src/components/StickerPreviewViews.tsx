"use client";

import { AppImage } from "@/components/AppImage";
import { PreviewWatermark } from "@/components/PreviewWatermark";

function a4Grid(count: number) {
  if (count <= 6) return { cols: 2, rows: Math.ceil(count / 2) };
  if (count <= 12) return { cols: 3, rows: Math.ceil(count / 3) };
  return { cols: 4, rows: Math.ceil(count / 4) };
}

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
  overlayPhrase,
  showWatermark,
}: {
  src: string;
  phrase: string;
  quantity: number;
  overlayPhrase: boolean;
  showWatermark: boolean;
}) {
  const { cols, rows } = a4Grid(quantity);
  const cells = Array.from({ length: quantity }, (_, index) => index);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <p className="text-sm font-semibold text-stone-800">스티커 모양</p>
        <p className="mt-1 text-xs text-stone-500">
          원형 스티커로 잘렸을 때 모습이에요.
        </p>
        <div
          className="no-image-save relative mx-auto mt-5 w-[70%] max-w-[16rem]"
          onContextMenu={(event) => event.preventDefault()}
        >
          <StickerFace src={src} phrase={phrase} overlayPhrase={overlayPhrase} />
          {showWatermark ? <PreviewWatermark /> : null}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <p className="text-sm font-semibold text-stone-800">A4 배치</p>
        <p className="mt-1 text-xs text-stone-500">
          A4 한 장에 {quantity}개가 이렇게 들어가요.
        </p>
        <div
          className="no-image-save relative mx-auto mt-4 w-full max-w-md overflow-hidden rounded-xl bg-[#f7f4ef] shadow-sm ring-1 ring-stone-200"
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="relative aspect-[210/297] p-[6%]">
            <div
              className="grid h-full w-full"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                gap: "4%",
              }}
            >
              {cells.map((cell) => (
                <div key={cell} className="min-h-0 min-w-0 p-[6%]">
                  <StickerFace
                    src={src}
                    phrase={phrase}
                    overlayPhrase={overlayPhrase}
                    compact
                  />
                </div>
              ))}
            </div>
            {showWatermark ? <PreviewWatermark /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
