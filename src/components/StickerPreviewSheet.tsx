"use client";

import { AppImage } from "@/components/AppImage";
import { PreviewWatermark } from "@/components/PreviewWatermark";

export function StickerPreviewSheet({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <div
      className="no-image-save relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="relative aspect-[210/297] bg-stone-100">
        <AppImage
          src={src}
          alt={alt}
          fill
          draggable={false}
          className="pointer-events-none object-contain"
          sizes="(max-width: 640px) 100vw, 36rem"
        />
        <PreviewWatermark />
        <div
          className="absolute inset-0 z-[1]"
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
        />
      </div>
    </div>
  );
}
