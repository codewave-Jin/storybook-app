"use client";

import { useRef, useState } from "react";
import { StickerLayoutPreview } from "@/components/StickerLayoutPreview";
import { STICKER_FONT_OPTIONS } from "@/lib/sticker-fonts";
import {
  DEFAULT_STICKER_LAYOUT,
  clampStickerLayout,
  cloneStickerLayout,
  layerBoxScale,
  scaleLayerBox,
  type StickerLayerKey,
  type StickerLayoutState,
} from "@/lib/sticker-layout-constants";
import {
  MAX_STICKER_BODY_LENGTH,
  MAX_STICKER_TITLE_LENGTH,
} from "@/lib/sticker-phrase";
import { cn } from "@/lib/utils";

const LAYER_LABEL: Record<StickerLayerKey, string> = {
  character: "캐릭터",
  text: "문구",
  border: "테두리",
};

export function StickerLayerEditor({
  borderSrc,
  characterSrc,
  title,
  body,
  phrase,
  layout,
  onChange,
  onPhraseChange,
}: {
  borderSrc?: string | null;
  characterSrc?: string | null;
  title: string;
  body: string;
  phrase: string;
  layout: StickerLayoutState;
  onChange: (layout: StickerLayoutState) => void;
  onPhraseChange: (next: { title: string; body: string }) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedLayer, setSelectedLayer] = useState<StickerLayerKey>("character");
  const dragRef = useRef<{
    layer: StickerLayerKey;
    startX: number;
    startY: number;
    origin: StickerLayoutState;
  } | null>(null);

  function updateLayout(next: StickerLayoutState) {
    onChange(clampStickerLayout(next));
  }

  function applyScale(nextScale: number) {
    const scale = Math.min(1.5, Math.max(0.7, nextScale));
    if (selectedLayer === "border") {
      updateLayout({
        ...layout,
        border: {
          ...layout.border,
          scale: DEFAULT_STICKER_LAYOUT.border.scale * scale,
        },
      });
      return;
    }
    if (selectedLayer === "character") {
      updateLayout({
        ...layout,
        character: scaleLayerBox(
          layout.character,
          DEFAULT_STICKER_LAYOUT.character,
          scale,
        ),
      });
    }
  }

  function layerFromEvent(event: React.PointerEvent<HTMLElement>): StickerLayerKey {
    const target = event.target as HTMLElement | null;
    const hit = target?.closest("[data-sticker-layer]");
    const layer = hit?.getAttribute("data-sticker-layer");
    if (layer === "character" || layer === "text" || layer === "border") {
      return layer;
    }
    return "border";
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const layer = layerFromEvent(event);
    setSelectedLayer(layer);
    dragRef.current = {
      layer,
      startX: event.clientX,
      startY: event.clientY,
      origin: cloneStickerLayout(layout),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const dx = (event.clientX - drag.startX) / rect.width;
    const dy = (event.clientY - drag.startY) / rect.height;
    if (drag.layer === "border") {
      updateLayout({
        ...drag.origin,
        border: {
          ...drag.origin.border,
          offsetXRatio: drag.origin.border.offsetXRatio + dx,
          offsetYRatio: drag.origin.border.offsetYRatio + dy,
        },
      });
      return;
    }
    const box = drag.origin[drag.layer];
    if ("leftRatio" in box) {
      updateLayout({
        ...drag.origin,
        [drag.layer]: {
          ...box,
          leftRatio: box.leftRatio + dx,
          topRatio: box.topRatio + dy,
        },
      });
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const selectedScale =
    selectedLayer === "border"
      ? layout.border.scale / DEFAULT_STICKER_LAYOUT.border.scale
      : layerBoxScale(layout.character, DEFAULT_STICKER_LAYOUT.character);

  return (
    <div>
      <p className="text-sm text-stone-500">
        미리보기에서 캐릭터나 테두리, 문구를 누르면 바로 고를 수 있어요.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(LAYER_LABEL) as StickerLayerKey[]).map((layer) => (
          <button
            key={layer}
            type="button"
            onClick={() => setSelectedLayer(layer)}
            className={cn(
              "h-10 rounded-full px-4 text-sm font-medium",
              selectedLayer === layer
                ? "bg-sky-400 text-white"
                : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-sky-50",
            )}
          >
            {LAYER_LABEL[layer]}
          </button>
        ))}
      </div>
      <div
        ref={canvasRef}
        className="mx-auto mt-5 w-full max-w-sm touch-none select-none [&_img]:pointer-events-none [&_img]:[-webkit-user-drag:none]"
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <StickerLayoutPreview
          borderSrc={borderSrc}
          characterSrc={characterSrc}
          phrase={phrase}
          layout={layout}
          selectedLayer={selectedLayer}
          onSelectLayer={setSelectedLayer}
        />
      </div>

      {selectedLayer === "text" ? (
        <div className="mt-5 space-y-3 rounded-2xl border border-stone-200 bg-white px-4 py-4">
          <p className="text-sm font-medium">문구 수정</p>
          <label className="block">
            <span className="text-xs text-stone-500">제목</span>
            <input
              value={title}
              maxLength={MAX_STICKER_TITLE_LENGTH}
              onChange={(event) =>
                onPhraseChange({ title: event.target.value, body })
              }
              className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-sky-400"
            />
          </label>
          <label className="block">
            <span className="text-xs text-stone-500">내용</span>
            <textarea
              value={body}
              maxLength={MAX_STICKER_BODY_LENGTH}
              rows={4}
              onChange={(event) =>
                onPhraseChange({ title, body: event.target.value })
              }
              className="mt-1 w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
            />
          </label>
          <label className="block">
            <span className="text-xs text-stone-500">폰트</span>
            <select
              value={layout.textStyle?.fontKey ?? "malgun-bold"}
              onChange={(event) =>
                updateLayout({
                  ...layout,
                  textStyle: {
                    ...(layout.textStyle ?? DEFAULT_STICKER_LAYOUT.textStyle),
                    fontKey: event.target.value,
                  },
                })
              }
              className="mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
            >
              {STICKER_FONT_OPTIONS.map((font) => (
                <option key={font.key} value={font.key}>
                  {font.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <SizeStepper
              label="제목 크기"
              value={layout.textStyle?.titleScale ?? 1}
              onChange={(titleScale) =>
                updateLayout({
                  ...layout,
                  textStyle: {
                    ...(layout.textStyle ?? DEFAULT_STICKER_LAYOUT.textStyle),
                    titleScale,
                  },
                })
              }
            />
            <SizeStepper
              label="내용 크기"
              value={layout.textStyle?.bodyScale ?? 1}
              onChange={(bodyScale) =>
                updateLayout({
                  ...layout,
                  textStyle: {
                    ...(layout.textStyle ?? DEFAULT_STICKER_LAYOUT.textStyle),
                    bodyScale,
                  },
                })
              }
            />
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-stone-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{LAYER_LABEL[selectedLayer]} 크기</p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-sky-600">
                {Math.round(selectedScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => updateLayout(cloneStickerLayout())}
                className="text-sm font-medium text-stone-500 hover:underline"
              >
                기본 배치로
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              aria-label="크기 줄이기"
              onClick={() => applyScale(selectedScale - 0.05)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 text-lg font-medium hover:bg-sky-50"
            >
              −
            </button>
            <input
              type="range"
              min={70}
              max={150}
              step={1}
              value={Math.round(selectedScale * 100)}
              onChange={(event) => applyScale(Number(event.target.value) / 100)}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-sky-400 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400"
            />
            <button
              type="button"
              aria-label="크기 키우기"
              onClick={() => applyScale(selectedScale + 0.05)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 text-lg font-medium hover:bg-sky-50"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SizeStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <p className="text-xs text-stone-500">{label}</p>
      <div className="mt-1 flex items-center justify-between rounded-xl border border-stone-200 px-2 py-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(0.7, value - 0.1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-sky-50"
        >
          −
        </button>
        <span className="text-sm font-medium">{Math.round(value * 100)}%</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(1.6, value + 0.1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-sky-50"
        >
          +
        </button>
      </div>
    </div>
  );
}
