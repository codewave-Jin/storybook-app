"use client";

import { useEffect, useRef, useState } from "react";
import { StickerLayoutPreview } from "@/components/StickerLayoutPreview";
import { DEFAULT_STICKER_DECAL_KEY, STICKER_DECAL_OPTIONS } from "@/lib/sticker-decals";
import { STICKER_FONT_OPTIONS } from "@/lib/sticker-fonts";
import {
  DEFAULT_DECAL_BASE,
  DEFAULT_STICKER_LAYOUT,
  MAX_STICKER_DECALS,
  MAX_STICKER_PHRASES,
  STICKER_CHARACTER_SCALE_MAX,
  STICKER_CHARACTER_SCALE_MIN,
  STICKER_DECAL_SCALE_MAX,
  STICKER_LAYER_SCALE_MAX,
  STICKER_LAYER_SCALE_MIN,
  clampStickerLayout,
  cloneStickerLayout,
  createDecalLayer,
  createPhraseLayer,
  decalIdFromLayerKey,
  decalLayerKey,
  firstSelectableLayer,
  layerBoxScale,
  moveStackItem,
  normalizeStack,
  phraseIdFromLayerKey,
  phraseLayerKey,
  resetStickerLayoutContent,
  scaleLayerBox,
  stickerPhraseBoxForText,
  type StickerLayerKey,
  type StickerLayoutState,
} from "@/lib/sticker-layout-constants";
import { MAX_STICKER_PHRASE_LENGTH } from "@/lib/sticker-phrase";
import { cn } from "@/lib/utils";

export type StickerEditorBorderOption = {
  id: string;
  key: string;
  label: string;
  thumbnailPath: string | null;
  imageUrl: string;
};

export function StickerLayerEditor({
  borderSrc,
  characterSrc,
  layout,
  onChange,
  borders = [],
  borderId = null,
  onBorderChange,
  transparentCanvas = false,
}: {
  borderSrc?: string | null;
  characterSrc?: string | null;
  phrase?: string;
  phrase1?: string;
  phrase2?: string;
  layout: StickerLayoutState;
  onChange: (layout: StickerLayoutState) => void;
  onPhraseChange?: (next: { phrase1: string; phrase2: string }) => void;
  borders?: StickerEditorBorderOption[];
  borderId?: string | null;
  onBorderChange?: (borderId: string) => void;
  transparentCanvas?: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedLayer, setSelectedLayer] = useState<StickerLayerKey | null>(
    () => firstSelectableLayer(layout),
  );
  const dragRef = useRef<{
    layer: StickerLayerKey;
    startX: number;
    startY: number;
    origin: StickerLayoutState;
  } | null>(null);

  function updateLayout(next: StickerLayoutState) {
    onChange(clampStickerLayout(next));
  }

  function selectLayer(layer: StickerLayerKey | null) {
    setSelectedLayer(layer);
  }

  const selectedPhraseId = selectedLayer
    ? phraseIdFromLayerKey(selectedLayer)
    : null;
  const selectedDecalId = selectedLayer
    ? decalIdFromLayerKey(selectedLayer)
    : null;
  const selectedPhrase = selectedPhraseId
    ? layout.phrases.find((item) => item.id === selectedPhraseId) ?? null
    : null;
  const selectedPhraseIndex = selectedPhrase
    ? layout.phrases.findIndex((item) => item.id === selectedPhrase.id)
    : -1;
  const selectedDecal = selectedDecalId
    ? layout.decals.find((item) => item.id === selectedDecalId) ?? null
    : null;
  const selectedDecalIndex = selectedDecal
    ? layout.decals.findIndex((item) => item.id === selectedDecal.id)
    : -1;

  function applyScale(nextScale: number) {
    if (!selectedLayer) {
      return;
    }
    const minScale =
      selectedLayer === "character"
        ? STICKER_CHARACTER_SCALE_MIN
        : STICKER_LAYER_SCALE_MIN;
    const maxScale =
      selectedLayer === "character"
        ? STICKER_CHARACTER_SCALE_MAX
        : selectedDecal
          ? STICKER_DECAL_SCALE_MAX
          : STICKER_LAYER_SCALE_MAX;
    const scale = Math.min(maxScale, Math.max(minScale, nextScale));
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
      return;
    }
    if (selectedDecal) {
      updateLayout({
        ...layout,
        decals: layout.decals.map((item) =>
          item.id === selectedDecal.id
            ? {
                ...item,
                box: scaleLayerBox(item.box, DEFAULT_DECAL_BASE, scale),
              }
            : item,
        ),
      });
    }
  }

  function layerFromEvent(event: React.PointerEvent<HTMLElement>): StickerLayerKey | null {
    const target = event.target as HTMLElement | null;
    const hit = target?.closest("[data-sticker-layer]");
    return hit?.getAttribute("data-sticker-layer") ?? null;
  }

  function isPointOutsideStickerCircle(clientX: number, clientY: number) {
    const canvas =
      canvasRef.current?.querySelector<HTMLElement>("[data-sticker-canvas]") ??
      canvasRef.current;
    if (!canvas) {
      return true;
    }
    const rect = canvas.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2;
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    return dx * dx + dy * dy > radius * radius;
  }

  function isOutsideStickerCircle(event: { clientX: number; clientY: number }) {
    return isPointOutsideStickerCircle(event.clientX, event.clientY);
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-sticker-editor-ui]")) {
        return;
      }
      if (isPointOutsideStickerCircle(event.clientX, event.clientY)) {
        setSelectedLayer(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    if (isOutsideStickerCircle(event)) {
      setSelectedLayer(null);
      return;
    }
    const layer = layerFromEvent(event);
    if (!layer || layer !== selectedLayer) {
      return;
    }
    event.preventDefault();
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
    if (drag.layer === "character") {
      updateLayout({
        ...drag.origin,
        character: {
          ...drag.origin.character,
          leftRatio: drag.origin.character.leftRatio + dx,
          topRatio: drag.origin.character.topRatio + dy,
        },
      });
      return;
    }
    const phraseId = phraseIdFromLayerKey(drag.layer);
    if (phraseId) {
      updateLayout({
        ...drag.origin,
        phrases: drag.origin.phrases.map((item) =>
          item.id === phraseId
            ? {
                ...item,
                box: {
                  ...item.box,
                  leftRatio: item.box.leftRatio + dx,
                  topRatio: item.box.topRatio + dy,
                },
              }
            : item,
        ),
      });
      return;
    }
    const decalId = decalIdFromLayerKey(drag.layer);
    if (decalId) {
      updateLayout({
        ...drag.origin,
        decals: drag.origin.decals.map((item) =>
          item.id === decalId
            ? {
                ...item,
                box: {
                  ...item.box,
                  leftRatio: item.box.leftRatio + dx,
                  topRatio: item.box.topRatio + dy,
                },
              }
            : item,
        ),
      });
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function addPhrase() {
    if (layout.phrases.length >= MAX_STICKER_PHRASES) {
      return;
    }
    const next = createPhraseLayer(layout.phrases.length);
    const nextLayout = clampStickerLayout({
      ...layout,
      phrases: [...layout.phrases, next],
    });
    updateLayout(nextLayout);
    setSelectedLayer(phraseLayerKey(next.id));
  }

  function addDecal() {
    if (layout.decals.length >= MAX_STICKER_DECALS) {
      return;
    }
    const next = createDecalLayer(layout.decals.length, DEFAULT_STICKER_DECAL_KEY);
    const nextLayout = clampStickerLayout({
      ...layout,
      decals: [...layout.decals, next],
    });
    updateLayout(nextLayout);
    setSelectedLayer(decalLayerKey(next.id));
  }

  function deleteLayer(key: StickerLayerKey) {
    const phraseId = phraseIdFromLayerKey(key);
    const decalId = decalIdFromLayerKey(key);
    let next = layout;
    if (key === "character") {
      next = { ...layout, characterVisible: false };
    } else if (key === "border") {
      next = { ...layout, borderVisible: false };
    } else if (phraseId) {
      next = {
        ...layout,
        phrases: layout.phrases.filter((item) => item.id !== phraseId),
      };
    } else if (decalId) {
      next = {
        ...layout,
        decals: layout.decals.filter((item) => item.id !== decalId),
      };
    }
    const previousStack = normalizeStack(layout);
    const clamped = clampStickerLayout(next);
    updateLayout(clamped);
    if (selectedLayer === key) {
      const nextStack = normalizeStack(clamped);
      const index = previousStack.indexOf(key);
      setSelectedLayer(
        nextStack[Math.min(Math.max(index, 0), nextStack.length - 1)] ?? null,
      );
    }
  }

  function deleteSelected() {
    if (!selectedLayer) {
      return;
    }
    deleteLayer(selectedLayer);
  }

  function moveSelected(delta: number) {
    if (!selectedLayer) {
      return;
    }
    const stack = normalizeStack(layout);
    const from = stack.indexOf(selectedLayer);
    if (from < 0) {
      return;
    }
    updateLayout({
      ...layout,
      stack: moveStackItem(stack, selectedLayer, from + delta),
    });
  }

  const selectedScale =
    selectedLayer === "border"
      ? layout.border.scale / DEFAULT_STICKER_LAYOUT.border.scale
      : selectedLayer === "character"
        ? layerBoxScale(layout.character, DEFAULT_STICKER_LAYOUT.character)
        : selectedDecal
          ? layerBoxScale(selectedDecal.box, DEFAULT_DECAL_BASE)
          : 1;
  const scalePercentMin = Math.round(
    (selectedLayer === "character"
      ? STICKER_CHARACTER_SCALE_MIN
      : STICKER_LAYER_SCALE_MIN) * 100,
  );
  const scalePercentMax = Math.round(
    (selectedLayer === "character"
      ? STICKER_CHARACTER_SCALE_MAX
      : selectedDecal
        ? STICKER_DECAL_SCALE_MAX
        : STICKER_LAYER_SCALE_MAX) * 100,
  );
  const selectedLabel = selectedPhrase
    ? `문구${selectedPhraseIndex + 1}`
    : selectedDecal
      ? `스티커${selectedDecalIndex + 1}`
      : selectedLayer === "border" && layout.borderVisible
        ? "테두리"
        : selectedLayer === "character" && layout.characterVisible
          ? "캐릭터"
          : "";
  const canDelete = Boolean(selectedLabel);
  const stack = normalizeStack(layout);
  const selectedStackIndex = selectedLayer ? stack.indexOf(selectedLayer) : -1;
  const layerTabs = stack.map((key) => {
    if (key === "character") {
      return { key, label: "캐릭터" };
    }
    if (key === "border") {
      return { key, label: "테두리" };
    }
    const phraseId = phraseIdFromLayerKey(key);
    if (phraseId) {
      const index = layout.phrases.findIndex((item) => item.id === phraseId);
      return { key, label: `문구${Math.max(index, 0) + 1}` };
    }
    const decalId = decalIdFromLayerKey(key);
    if (decalId) {
      const index = layout.decals.findIndex((item) => item.id === decalId);
      return { key, label: `스티커${Math.max(index, 0) + 1}` };
    }
    return { key, label: key };
  });

  return (
    <div>
      <div
        ref={canvasRef}
        className="mx-auto w-full max-w-lg touch-none select-none px-2 py-1 sm:px-6 sm:py-3 [&_img]:pointer-events-none [&_img]:[-webkit-user-drag:none]"
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="mx-auto w-full max-w-[15.5rem] sm:max-w-sm">
          <StickerLayoutPreview
            borderSrc={borderSrc}
            characterSrc={characterSrc}
            layout={layout}
            selectedLayer={selectedLayer}
            transparentCanvas={transparentCanvas}
          />
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-lg px-4 text-center text-xs leading-relaxed text-stone-600 sm:mt-3 sm:text-sm">
        위치·문구·크기를 자유롭게 수정할 수 있어요. 미리보기를 끌어 옮겨 보세요.
      </p>
      <div
        className="mx-auto mt-3 w-full max-w-lg rounded-2xl border border-stone-200/80 bg-white p-3 shadow-sm sm:mt-4 sm:p-4"
        data-sticker-editor-ui
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-stone-800">레이어</p>
            <p className="mt-0.5 text-[11px] text-stone-400">
              눌러 선택하고, 끌어 순서를 바꿔요
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {layerTabs.map((tab, index) => {
            const selected = selectedLayer === tab.key;
            return (
              <div
                key={tab.key}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", tab.key);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromKey = event.dataTransfer.getData("text/plain");
                  if (!fromKey || fromKey === tab.key) {
                    return;
                  }
                  updateLayout({
                    ...layout,
                    stack: moveStackItem(stack, fromKey, index),
                  });
                }}
                className="shrink-0 cursor-grab active:cursor-grabbing"
              >
                <div
                  className={cn(
                    "inline-flex h-9 items-center rounded-full pl-3 pr-1 sm:h-10",
                    selected
                      ? "bg-sky-400 text-white shadow-sm shadow-sky-200"
                      : "bg-stone-50 text-stone-700 ring-1 ring-stone-200 hover:bg-sky-50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      selectLayer(selected ? null : tab.key)
                    }
                    className="pr-1 text-xs font-medium sm:text-sm"
                  >
                    {tab.label}
                  </button>
                  <button
                    type="button"
                    aria-label={`${tab.label} 삭제`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteLayer(tab.key);
                    }}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-sm leading-none",
                      selected
                        ? "text-white/85 hover:bg-white/20"
                        : "text-stone-400 hover:bg-red-50 hover:text-red-500",
                    )}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-stone-100 pt-3">
          <p className="text-sm font-semibold text-stone-800">추가하기</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <AddToolButton
              label="문구 추가"
              onClick={addPhrase}
              disabled={layout.phrases.length >= MAX_STICKER_PHRASES}
            />
            <AddToolButton
              label="스티커 추가"
              onClick={addDecal}
              disabled={layout.decals.length >= MAX_STICKER_DECALS}
            />
            {layout.characterVisible ? null : (
              <AddToolButton
                label="캐릭터 추가"
                onClick={() => {
                  updateLayout({ ...layout, characterVisible: true });
                  setSelectedLayer("character");
                }}
              />
            )}
            {layout.borderVisible ? null : (
              <AddToolButton
                label="테두리 추가"
                onClick={() => {
                  updateLayout({ ...layout, borderVisible: true });
                  setSelectedLayer("border");
                }}
              />
            )}
          </div>
        </div>
      </div>

      {selectedPhrase ? (
        <div
          className="mx-auto mt-3 w-full max-w-lg space-y-2 rounded-2xl border border-stone-200/80 bg-white px-3 py-3 shadow-sm sm:mt-4 sm:px-4"
          data-sticker-editor-ui
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{selectedLabel}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedStackIndex <= 0}
                onClick={() => moveSelected(-1)}
                className="text-sm font-medium text-stone-500 hover:underline disabled:opacity-40"
              >
                뒤로
              </button>
              <button
                type="button"
                disabled={selectedStackIndex < 0 || selectedStackIndex >= stack.length - 1}
                onClick={() => moveSelected(1)}
                className="text-sm font-medium text-stone-500 hover:underline disabled:opacity-40"
              >
                앞으로
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                className="text-sm font-medium text-red-500 hover:underline"
              >
                삭제
              </button>
            </div>
          </div>
          <label className="block">
            <span className="text-[11px] text-stone-500">내용</span>
            <textarea
              value={selectedPhrase.text}
              maxLength={MAX_STICKER_PHRASE_LENGTH}
              rows={selectedPhraseIndex === 0 ? 2 : 3}
              onChange={(event) =>
                updateLayout({
                  ...layout,
                  phrases: layout.phrases.map((item) =>
                    item.id === selectedPhrase.id
                      ? {
                          ...item,
                          text: event.target.value,
                          box: stickerPhraseBoxForText(
                            event.target.value,
                            item.style.scale,
                            item.box,
                          ),
                        }
                      : item,
                  ),
                })
              }
              className="mt-0.5 w-full resize-none rounded-lg border border-stone-200 px-2 py-1.5 text-sm outline-none focus:border-sky-400"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-stone-500">폰트</span>
            <select
              value={selectedPhrase.style.fontKey}
              onChange={(event) =>
                updateLayout({
                  ...layout,
                  phrases: layout.phrases.map((item) =>
                    item.id === selectedPhrase.id
                      ? {
                          ...item,
                          style: { ...item.style, fontKey: event.target.value },
                        }
                      : item,
                  ),
                })
              }
              className="mt-0.5 h-9 w-full rounded-lg border border-stone-200 bg-white px-2 text-sm outline-none focus:border-sky-400"
            >
              {STICKER_FONT_OPTIONS.map((font) => (
                <option key={font.key} value={font.key}>
                  {font.label}
                </option>
              ))}
            </select>
          </label>
          <SizeStepper
            label="크기"
            value={selectedPhrase.style.scale}
            onChange={(scale) =>
              updateLayout({
                ...layout,
                phrases: layout.phrases.map((item) =>
                  item.id === selectedPhrase.id
                    ? {
                        ...item,
                        style: { ...item.style, scale },
                        box: stickerPhraseBoxForText(item.text, scale, item.box),
                      }
                    : item,
                ),
              })
            }
          />
        </div>
      ) : selectedDecal ? (
        <div
          className="mx-auto mt-3 w-full max-w-lg space-y-3 rounded-2xl border border-stone-200/80 bg-white px-3 py-3 shadow-sm sm:mt-4 sm:px-4 sm:py-4"
          data-sticker-editor-ui
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{selectedLabel}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedStackIndex <= 0}
                onClick={() => moveSelected(-1)}
                className="text-sm font-medium text-stone-500 hover:underline disabled:opacity-40"
              >
                뒤로
              </button>
              <button
                type="button"
                disabled={selectedStackIndex < 0 || selectedStackIndex >= stack.length - 1}
                onClick={() => moveSelected(1)}
                className="text-sm font-medium text-stone-500 hover:underline disabled:opacity-40"
              >
                앞으로
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                className="text-sm font-medium text-red-500 hover:underline"
              >
                삭제
              </button>
            </div>
          </div>
          <div>
            <p className="text-[11px] text-stone-500">스티커</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {STICKER_DECAL_OPTIONS.map((option) => {
                const active = selectedDecal.assetKey === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() =>
                      updateLayout({
                        ...layout,
                        decals: layout.decals.map((item) =>
                          item.id === selectedDecal.id
                            ? { ...item, assetKey: option.key }
                            : item,
                        ),
                      })
                    }
                    className={cn(
                      "flex h-16 w-16 flex-col items-center justify-center rounded-xl border bg-white p-1.5",
                      active
                        ? "border-sky-400 ring-2 ring-sky-300"
                        : "border-stone-200 hover:border-stone-300",
                    )}
                  >
                    <img
                      src={option.src}
                      alt={option.label}
                      className="h-8 w-8 object-contain"
                    />
                    <span className="mt-1 text-[11px] text-stone-600">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-stone-500">크기</p>
              <span className="text-sm font-semibold text-sky-600">
                {Math.round(selectedScale * 100)}%
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
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
                min={scalePercentMin}
                max={scalePercentMax}
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
        </div>
      ) : selectedLabel ? (
        <div
          className="mx-auto mt-3 w-full max-w-lg rounded-2xl border border-stone-200/80 bg-white px-3 py-3 shadow-sm sm:mt-4 sm:px-4 sm:py-4"
          data-sticker-editor-ui
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {selectedLayer === "border" ? selectedLabel : `${selectedLabel} 크기`}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-sky-600">
                {Math.round(selectedScale * 100)}%
              </span>
              <button
                type="button"
                disabled={selectedStackIndex <= 0}
                onClick={() => moveSelected(-1)}
                className="text-sm font-medium text-stone-500 hover:underline disabled:opacity-40"
              >
                뒤로
              </button>
              <button
                type="button"
                disabled={selectedStackIndex < 0 || selectedStackIndex >= stack.length - 1}
                onClick={() => moveSelected(1)}
                className="text-sm font-medium text-stone-500 hover:underline disabled:opacity-40"
              >
                앞으로
              </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="text-sm font-medium text-red-500 hover:underline"
                >
                  삭제
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => updateLayout(resetStickerLayoutContent(layout))}
                className="text-sm font-medium text-stone-500 hover:underline"
              >
                기본 배치로
              </button>
            </div>
          </div>
          {selectedLayer === "border" && borders.length > 0 ? (
            <div className="mt-3">
              <p className="text-[11px] text-stone-500">테두리</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {borders.map((option) => {
                  const active = option.id === borderId;
                  const thumb = option.thumbnailPath ?? option.imageUrl;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onBorderChange?.(option.id);
                        if (!layout.borderVisible) {
                          updateLayout({ ...layout, borderVisible: true });
                        }
                      }}
                      className={cn(
                        "flex h-16 w-16 flex-col items-center justify-center rounded-xl border bg-white p-1.5",
                        active
                          ? "border-sky-400 ring-2 ring-sky-300"
                          : "border-stone-200 hover:border-stone-300",
                      )}
                    >
                      {option.key === "none" ? (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-stone-300 text-[9px] text-stone-400">
                          없음
                        </span>
                      ) : (
                        <img
                          src={thumb}
                          alt={option.label}
                          className="h-8 w-8 rounded-full object-contain"
                        />
                      )}
                      <span className="mt-1 max-w-full truncate text-[11px] text-stone-600">
                        {option.key === "none"
                          ? "없음"
                          : option.label.replace(/\s*테두리$/, "")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
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
              min={scalePercentMin}
              max={scalePercentMax}
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
      ) : null}
    </div>
  );
}

function AddToolButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-sky-200 bg-gradient-to-b from-sky-50 to-white text-sm font-medium text-sky-800 shadow-sm hover:border-sky-300 hover:from-sky-100 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 text-[13px] font-semibold leading-none text-white">
        +
      </span>
      {label}
    </button>
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
      <p className="text-[11px] text-stone-500">{label}</p>
      <div className="mt-0.5 flex items-center justify-between rounded-lg border border-stone-200 px-1 py-0.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(0.5, Number((value - 0.1).toFixed(1))))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-sky-50"
        >
          −
        </button>
        <span className="text-xs font-medium">{Math.round(value * 100)}%</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(2.4, Number((value + 0.1).toFixed(1))))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-sky-50"
        >
          +
        </button>
      </div>
    </div>
  );
}
