"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  addAlbumSpread,
  removeAlbumSpread,
  requestAlbumPrint,
  saveAlbumSlotPhoto,
  saveAlbumSlotPosition,
  type AddAlbumSpreadState,
  type RemoveAlbumSpreadState,
  type RequestAlbumPrintState,
  type SaveAlbumPhotoState,
} from "@/app/actions/album";
import { AppImage } from "@/components/AppImage";
import { PrintRequestDialog } from "@/components/PrintRequestDialog";
import {
  PHOTO_ALBUM_INITIAL_SPREAD_COUNT,
  PHOTO_ALBUM_MAX_SPREAD_COUNT,
  albumLayoutById,
  countAlbumFilledSlots,
  coverOverflowPx,
  pairAlbumPagesIntoSpreads,
  panCoverFocus,
  parseAlbumSlotPhotos,
  spreadSlotsForLeaf,
  type AlbumSlot,
  type AlbumSlotPhoto,
} from "@/lib/photo-album";

export type AlbumEditorPage = {
  id: string;
  pageNumber: number;
  layoutId: string;
  photoPaths: unknown;
};

function slotFocusKey(pageId: string, slotId: string) {
  return `${pageId}:${slotId}`;
}

type DragState = {
  pointerId: number;
  lastX: number;
  lastY: number;
  originX: number;
  originY: number;
  moved: boolean;
  cleanup: () => void;
};

function startAlbumPhotoDrag(
  dragRef: { current: DragState | null },
  event: { pointerId?: number; clientX: number; clientY: number },
  onMove: (dx: number, dy: number) => void,
  onEnd: (moved: boolean) => void,
) {
  dragRef.current?.cleanup();

  const pointerId = event.pointerId ?? -1;
  const drag: DragState = {
    pointerId,
    lastX: event.clientX,
    lastY: event.clientY,
    originX: event.clientX,
    originY: event.clientY,
    moved: false,
    cleanup: () => {},
  };

  function handleMove(next: { pointerId?: number; clientX: number; clientY: number }) {
    if (dragRef.current !== drag) {
      return;
    }
    if (next.pointerId != null && next.pointerId !== drag.pointerId) {
      return;
    }
    const dx = next.clientX - drag.lastX;
    const dy = next.clientY - drag.lastY;
    if (!drag.moved) {
      const travel = Math.hypot(next.clientX - drag.originX, next.clientY - drag.originY);
      if (travel < 3) {
        return;
      }
      drag.moved = true;
    }
    drag.lastX = next.clientX;
    drag.lastY = next.clientY;
    onMove(dx, dy);
  }

  function handleUp(next: { pointerId?: number }) {
    if (dragRef.current !== drag) {
      return;
    }
    if (next.pointerId != null && next.pointerId !== drag.pointerId) {
      return;
    }
    const moved = drag.moved;
    cleanup();
    onEnd(moved);
  }

  function onPointerMove(native: PointerEvent) {
    native.preventDefault();
    handleMove(native);
  }
  function onPointerUp(native: PointerEvent) {
    handleUp(native);
  }
  function onMouseMove(native: MouseEvent) {
    if (drag.pointerId !== -1) {
      return;
    }
    native.preventDefault();
    handleMove(native);
  }
  function onMouseUp() {
    if (drag.pointerId !== -1) {
      return;
    }
    handleUp({});
  }

  function cleanup() {
    if (dragRef.current === drag) {
      dragRef.current = null;
    }
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  drag.cleanup = cleanup;
  dragRef.current = drag;

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

function AlbumSlotButton({
  orderId,
  pageId,
  slot,
  photo,
  onFocusChange,
  readOnly = false,
  onFilled,
}: {
  orderId: string;
  pageId: string;
  slot: AlbumSlot;
  photo?: AlbumSlotPhoto;
  onFocusChange?: (focus: { x: number; y: number }) => void;
  readOnly?: boolean;
  onFilled?: (filled: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const naturalRef = useRef({ w: 0, h: 0 });
  const dragRef = useRef<DragState | null>(null);
  const focusRef = useRef({ x: photo?.x ?? 50, y: photo?.y ?? 50 });
  const onFocusChangeRef = useRef(onFocusChange);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [focus, setFocus] = useState({ x: photo?.x ?? 50, y: photo?.y ?? 50 });
  const [dragging, setDragging] = useState(false);
  const [state, formAction] = useFormState<SaveAlbumPhotoState, FormData>(
    saveAlbumSlotPhoto,
    undefined,
  );
  const shown = state?.photoPath || localUrl || photo?.path || "";
  const objectPosition = `${focus.x}% ${focus.y}%`;
  const onFilledRef = useRef(onFilled);
  onFilledRef.current = onFilled;

  onFocusChangeRef.current = onFocusChange;

  useEffect(() => {
    onFilledRef.current?.(Boolean(shown));
  }, [shown]);

  useEffect(() => {
    return () => {
      dragRef.current?.cleanup();
      onFocusChangeRef.current?.(focusRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [localUrl]);

  useEffect(() => {
    if (!state?.success || !state.photoPath) {
      return;
    }
    persistFocus(state.photoPath);
    // persistFocus reads the latest focus from a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success, state?.photoPath]);

  function rememberNaturalSize(width: number, height: number) {
    if (width > 0 && height > 0) {
      naturalRef.current = { w: width, h: height };
    }
  }

  function readNaturalSize() {
    const image = frameRef.current?.querySelector("img");
    if (image instanceof HTMLImageElement) {
      rememberNaturalSize(image.naturalWidth, image.naturalHeight);
    }
  }

  function applyFocus(next: { x: number; y: number }) {
    focusRef.current = next;
    setFocus(next);
  }

  function moveFocus(deltaX: number, deltaY: number) {
    const box = frameRef.current?.getBoundingClientRect();
    if (!box) {
      return;
    }
    applyFocus(
      panCoverFocus(
        focusRef.current,
        { x: deltaX, y: deltaY },
        coverOverflowPx(
          box.width,
          box.height,
          naturalRef.current.w,
          naturalRef.current.h,
        ),
      ),
    );
  }

  function persistFocus(photoPath = shown) {
    onFocusChangeRef.current?.(focusRef.current);
    if (!photoPath || photoPath.startsWith("blob:")) {
      return;
    }
    void saveAlbumSlotPosition({
      orderId,
      pageId,
      slotId: slot.id,
      x: focusRef.current.x,
      y: focusRef.current.y,
    });
  }

  return (
    <form
      action={formAction}
      className="absolute"
      style={{
        left: `${slot.left}%`,
        top: `${slot.top}%`,
        width: `${slot.width}%`,
        height: `${slot.height}%`,
        transform: slot.rotate ? `rotate(${slot.rotate}deg)` : undefined,
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="pageId" value={pageId} />
      <input type="hidden" name="slotId" value={slot.id} />
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[3px] bg-white p-[5px] shadow-[0_3px_14px_rgba(70,50,30,0.18)] ring-1 ring-stone-300/80 sm:p-[6px]">
        <div
          ref={frameRef}
          className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#eee7dc]"
        >
          {shown ? (
            <>
              <div
                role="slider"
                aria-label="사진 위치 조정"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(focus.x)}
                className={`absolute inset-0 touch-none select-none ${
                  readOnly
                    ? "cursor-default"
                    : dragging
                      ? "cursor-grabbing"
                      : "cursor-grab"
                }`}
                onPointerDown={
                  readOnly
                    ? undefined
                    : (event) => {
                  if (event.button !== 0) {
                    return;
                  }
                  event.preventDefault();
                  readNaturalSize();
                  try {
                    event.currentTarget.setPointerCapture(event.pointerId);
                  } catch {
                    // Some drivers cannot capture; window listeners still pan.
                  }
                  setDragging(true);
                  startAlbumPhotoDrag(
                    dragRef,
                    event,
                    moveFocus,
                    (moved) => {
                      setDragging(false);
                      if (moved) {
                        persistFocus();
                      }
                    },
                  );
                }}
                onMouseDown={
                  readOnly
                    ? undefined
                    : (event) => {
                        if (event.button !== 0 || dragRef.current) {
                          return;
                        }
                        event.preventDefault();
                        readNaturalSize();
                        setDragging(true);
                        startAlbumPhotoDrag(
                          dragRef,
                          event,
                          moveFocus,
                          (moved) => {
                            setDragging(false);
                            if (moved) {
                              persistFocus();
                            }
                          },
                        );
                      }
                }
              >
                {shown.startsWith("blob:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shown}
                    alt=""
                    draggable={false}
                    className="pointer-events-none h-full w-full object-cover"
                    style={{ objectPosition }}
                    onLoad={(event) =>
                      rememberNaturalSize(
                        event.currentTarget.naturalWidth,
                        event.currentTarget.naturalHeight,
                      )
                    }
                  />
                ) : (
                  <AppImage
                    src={shown}
                    alt="앨범 사진"
                    fill
                    draggable={false}
                    className="pointer-events-none object-cover"
                    style={{ objectPosition }}
                    sizes="20vw"
                    onLoad={(event) =>
                      rememberNaturalSize(
                        event.currentTarget.naturalWidth,
                        event.currentTarget.naturalHeight,
                      )
                    }
                  />
                )}
              </div>
              {readOnly ? null : (
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => inputRef.current?.click()}
                className="absolute right-1 top-1 z-10 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 shadow-sm ring-1 ring-stone-200/80 hover:bg-white sm:text-[11px]"
              >
                바꾸기
              </button>
              )}
            </>
          ) : (
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (readOnly) {
                  return;
                }
                inputRef.current?.click();
              }}
              className="flex h-full w-full cursor-pointer items-center justify-center px-1 text-center sm:px-2"
            >
              <span>
                <span className="block text-xs font-medium text-stone-600 sm:text-sm">
                  사진 넣기
                </span>
                <span className="mt-0.5 hidden text-[11px] text-stone-400 sm:block">
                  클릭해서 사진을 고르세요
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        name="photo"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }
          const nextUrl = URL.createObjectURL(file);
          applyFocus({ x: 50, y: 50 });
          onFocusChangeRef.current?.({ x: 50, y: 50 });
          naturalRef.current = { w: 0, h: 0 };
          setLocalUrl((current) => {
            if (current) {
              URL.revokeObjectURL(current);
            }
            return nextUrl;
          });
          event.currentTarget.form?.requestSubmit();
        }}
      />
      {state?.error ? (
        <p className="absolute inset-x-1 bottom-1 z-10 rounded bg-red-50/95 px-1 py-0.5 text-center text-[10px] text-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function AlbumLeafSlots({
  orderId,
  page,
  side,
  focusBySlot,
  onSlotFocusChange,
  readOnly,
  onSlotFilled,
}: {
  orderId: string;
  page: AlbumEditorPage;
  side: "left" | "right";
  focusBySlot: Record<string, { x: number; y: number }>;
  onSlotFocusChange: (
    pageId: string,
    slotId: string,
    focus: { x: number; y: number },
  ) => void;
  readOnly?: boolean;
  onSlotFilled?: (pageId: string, slotId: string, filled: boolean) => void;
}) {
  const photos = parseAlbumSlotPhotos(page.photoPaths);
  return (
    <>
      {spreadSlotsForLeaf(side).map((slot) => {
        const saved = photos[slot.id];
        const override = focusBySlot[slotFocusKey(page.id, slot.id)];
        const photo = saved ? { ...saved, ...(override ?? {}) } : undefined;
        return (
          <AlbumSlotButton
            key={`${page.id}-${slot.id}`}
            orderId={orderId}
            pageId={page.id}
            slot={slot}
            photo={photo}
            readOnly={readOnly}
            onFilled={(filled) => onSlotFilled?.(page.id, slot.id, filled)}
            onFocusChange={(focus) => onSlotFocusChange(page.id, slot.id, focus)}
          />
        );
      })}
    </>
  );
}

function AlbumSpread({
  orderId,
  leftPage,
  rightPage,
  focusBySlot,
  onSlotFocusChange,
  readOnly,
  onSlotFilled,
}: {
  orderId: string;
  leftPage?: AlbumEditorPage;
  rightPage?: AlbumEditorPage;
  focusBySlot: Record<string, { x: number; y: number }>;
  onSlotFocusChange: (
    pageId: string,
    slotId: string,
    focus: { x: number; y: number },
  ) => void;
  readOnly?: boolean;
  onSlotFilled?: (pageId: string, slotId: string, filled: boolean) => void;
}) {
  return (
    <figure className="relative overflow-hidden rounded-2xl bg-[#f3eee6] shadow-sm ring-1 ring-stone-200">
      <div className="relative aspect-[2/1]">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px bg-stone-400/25" />
        {leftPage ? (
          <AlbumLeafSlots
            orderId={orderId}
            page={leftPage}
            side="left"
            focusBySlot={focusBySlot}
            onSlotFocusChange={onSlotFocusChange}
            readOnly={readOnly}
            onSlotFilled={onSlotFilled}
          />
        ) : null}
        {rightPage ? (
          <AlbumLeafSlots
            orderId={orderId}
            page={rightPage}
            side="right"
            focusBySlot={focusBySlot}
            onSlotFocusChange={onSlotFocusChange}
            readOnly={readOnly}
            onSlotFilled={onSlotFilled}
          />
        ) : null}
        {leftPage ? (
          <span className="pointer-events-none absolute bottom-1.5 left-[25%] z-10 -translate-x-1/2 text-[10px] font-medium text-stone-400">
            {leftPage.pageNumber}
          </span>
        ) : null}
        {rightPage ? (
          <span className="pointer-events-none absolute bottom-1.5 left-[75%] z-10 -translate-x-1/2 text-[10px] font-medium text-stone-400">
            {rightPage.pageNumber}
          </span>
        ) : null}
      </div>
    </figure>
  );
}

function AddSpreadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full items-center justify-center rounded-xl border border-stone-200 bg-white text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "추가 중..." : "페이지 추가하기"}
    </button>
  );
}

function RemoveSpreadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm ring-1 ring-stone-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "삭제 중..." : "페이지 삭제"}
    </button>
  );
}

export function PhotoAlbumEditor({
  title,
  orderId,
  pages,
  printRequested = false,
}: {
  title: string;
  orderId: string;
  pages: AlbumEditorPage[];
  printRequested?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [focusBySlot, setFocusBySlot] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [localFilled, setLocalFilled] = useState<Record<string, boolean>>({});
  const [confirmingPrint, setConfirmingPrint] = useState(false);
  const [printState, requestPrint] = useFormState<
    RequestAlbumPrintState,
    FormData
  >(requestAlbumPrint, undefined);
  const [addState, addSpread] = useFormState<AddAlbumSpreadState, FormData>(
    addAlbumSpread,
    undefined,
  );
  const [removeState, removeSpread] = useFormState<
    RemoveAlbumSpreadState,
    FormData
  >(removeAlbumSpread, undefined);
  const spreads = pairAlbumPagesIntoSpreads(pages);
  const lastIndex = Math.max(spreads.length - 1, 0);
  const safeIndex = Math.min(index, lastIndex);
  const spread = spreads[safeIndex];
  const serverFilled = countAlbumFilledSlots(pages);
  const filledKeys = new Set<string>();
  for (const item of pages) {
    const itemLayout = albumLayoutById(item.layoutId);
    const photos = parseAlbumSlotPhotos(item.photoPaths);
    for (const slot of itemLayout.slots) {
      const key = slotFocusKey(item.id, slot.id);
      if (photos[slot.id]?.path || localFilled[key]) {
        filledKeys.add(key);
      }
    }
  }
  const filled = filledKeys.size;
  const required = serverFilled.required;
  const albumComplete = required > 0 && filled >= required;
  const readOnly = printRequested;
  const onLastSpread = safeIndex >= lastIndex;
  const canAddSpread =
    !readOnly && onLastSpread && spreads.length < PHOTO_ALBUM_MAX_SPREAD_COUNT;
  const canRemoveSpread =
    !readOnly && safeIndex >= PHOTO_ALBUM_INITIAL_SPREAD_COUNT;

  useEffect(() => {
    if (addState?.success && addState.spreadIndex != null) {
      setIndex(addState.spreadIndex);
    }
  }, [addState]);

  useEffect(() => {
    if (removeState?.success && removeState.spreadIndex != null) {
      setIndex(removeState.spreadIndex);
    }
  }, [removeState]);

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

  return (
    <div className="flex min-h-dvh flex-col bg-[#eaf4fb] text-stone-800">
      <header className="sticky top-0 z-30 border-b border-sky-100/80 bg-[#eaf4fb]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:h-16 sm:px-4">
          <Link
            href={`/dashboard/orders/${orderId}/preview`}
            aria-label="동화책으로"
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
            {title} 사진첩
          </h1>
          <span className="h-10 w-10 shrink-0" aria-hidden />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-40 pt-4 sm:px-4 sm:pt-6">
        <p className="mb-4 text-center text-sm text-stone-500">
          {printRequested
            ? "인쇄 의뢰가 접수되어 사진을 바꿀 수 없어요."
            : "칸을 눌러 사진을 넣으세요. 2번째 펼침부터 페이지를 추가할 수 있고, 최대 4면까지예요."}
        </p>
        <div className="flex flex-1 items-center justify-center">
          <article className="w-full max-w-2xl sm:max-w-3xl">
            {spread ? (
              <div className="relative">
                {canRemoveSpread ? (
                  <form
                    action={removeSpread}
                    className="absolute right-2 top-2 z-20"
                    onSubmit={(event) => {
                      if (
                        !window.confirm(
                          "이 펼침을 삭제할까요? 넣은 사진도 함께 지워집니다.",
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="orderId" value={orderId} />
                    <input
                      type="hidden"
                      name="spreadIndex"
                      value={safeIndex}
                    />
                    <RemoveSpreadButton />
                  </form>
                ) : null}
                <AlbumSpread
                  orderId={orderId}
                  leftPage={spread.leftPage}
                  rightPage={spread.rightPage}
                  focusBySlot={focusBySlot}
                  readOnly={readOnly}
                  onSlotFilled={(pageId, slotId, slotFilled) =>
                    setLocalFilled((current) => ({
                      ...current,
                      [slotFocusKey(pageId, slotId)]: slotFilled,
                    }))
                  }
                  onSlotFocusChange={(pageId, slotId, focus) =>
                    setFocusBySlot((current) => ({
                      ...current,
                      [slotFocusKey(pageId, slotId)]: focus,
                    }))
                  }
                />
              </div>
            ) : (
              <p className="text-center text-sm text-stone-500">
                사진첩 페이지가 없습니다.
              </p>
            )}
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
              {safeIndex + 1} / {spreads.length}
            </p>
            {canAddSpread ? (
              <form action={addSpread} className="flex-1">
                <input type="hidden" name="orderId" value={orderId} />
                <AddSpreadButton />
              </form>
            ) : (
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
            )}
          </div>
          {printState?.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-[11px] text-red-700">
              {printState.error}
            </p>
          ) : null}
          {addState?.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-[11px] text-red-700">
              {addState.error}
            </p>
          ) : null}
          {removeState?.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-[11px] text-red-700">
              {removeState.error}
            </p>
          ) : null}
          {printRequested ? (
            <Link
              href="/dashboard"
              className="flex h-12 items-center justify-center rounded-xl bg-sky-400 text-sm font-medium text-white hover:bg-sky-500"
            >
              인쇄 의뢰가 접수되었어요
            </Link>
          ) : albumComplete ? (
            <button
              type="button"
              onClick={() => setConfirmingPrint(true)}
              className="flex h-12 items-center justify-center rounded-xl bg-[#E07A5F] text-sm font-semibold text-white hover:bg-[#d56c51]"
            >
              인쇄 의뢰하기
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="flex h-12 items-center justify-center rounded-xl bg-sky-400 text-sm font-medium text-white hover:bg-sky-500"
            >
              사진첩 저장하고 나가기
            </Link>
          )}
          <PrintRequestDialog
            open={confirmingPrint && albumComplete && !printRequested}
            orderId={orderId}
            error={printState?.error}
            formAction={requestPrint}
            onClose={() => setConfirmingPrint(false)}
          />
          {!printRequested && !albumComplete && required > 0 ? (
            <p className="text-center text-[11px] text-stone-400">
              사진을 모두 넣으면 인쇄를 의뢰할 수 있어요. {filled} / {required}
            </p>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
