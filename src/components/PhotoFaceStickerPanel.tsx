"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { CharacterPhotoPicker } from "@/components/CharacterPhotoPicker";
import { cutoutHeadPng, faceKeepAlpha } from "@/lib/head-cutout";

function originalCharacterImageSrc(src: string) {
  if (!src.includes("/api/media/character/")) {
    return src;
  }
  const url = new URL(src, "http://local");
  url.searchParams.set("v", "original");
  return `${url.pathname}?${url.searchParams.toString()}`;
}

type CutoutTool = "erase" | "restore";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

function fitAlpha(
  alpha: Uint8ClampedArray,
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number,
) {
  if (fromWidth === toWidth && fromHeight === toHeight) {
    return alpha;
  }
  const fitted = new Uint8ClampedArray(toWidth * toHeight);
  for (let y = 0; y < toHeight; y += 1) {
    const sourceY = Math.min(fromHeight - 1, Math.floor(((y + 0.5) * fromHeight) / toHeight));
    for (let x = 0; x < toWidth; x += 1) {
      const sourceX = Math.min(fromWidth - 1, Math.floor(((x + 0.5) * fromWidth) / toWidth));
      fitted[y * toWidth + x] = alpha[sourceY * fromWidth + sourceX] ?? 0;
    }
  }
  return fitted;
}

function CutoutEraser({
  src,
  sourceSrc,
  disabled,
  onChange,
  onError,
}: {
  src: string;
  sourceSrc: string;
  disabled: boolean;
  onChange: (blob: Blob) => void;
  onError: (message: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const originalRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const scrollAnchorRef = useRef<{
    contentX: number;
    contentY: number;
    fromZoom: number;
    viewX: number;
    viewY: number;
  } | null>(null);
  const [tool, setTool] = useState<CutoutTool | null>(null);
  const [brush, setBrush] = useState(28);
  const [autoBusy, setAutoBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let cancelled = false;
    const cutout = new Image();
    const source = new Image();
    let pending = 2;
    const finish = () => {
      pending -= 1;
      if (pending > 0 || cancelled) {
        return;
      }
      const width = cutout.naturalWidth || cutout.width;
      const height = cutout.naturalHeight || cutout.height;
      const original = document.createElement("canvas");
      original.width = width;
      original.height = height;
      original.getContext("2d", { willReadFrequently: true })?.drawImage(source, 0, 0, width, height);
      originalRef.current = original;
      canvas.width = width;
      canvas.height = height;
      zoomRef.current = 1;
      setZoom(1);
      setImageSize({ width, height });
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(cutout, 0, 0);
    };
    cutout.onload = finish;
    source.onload = finish;
    cutout.src = src;
    source.src = sourceSrc;
    return () => {
      cancelled = true;
    };
  }, [src, sourceSrc]);

  useEffect(() => {
    if (!tool && ringRef.current) {
      ringRef.current.style.opacity = "0";
    }
  }, [tool]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const update = () => {
      setFrameSize({ width: frame.clientWidth, height: frame.clientHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      changeZoom(zoomRef.current + (event.deltaY < 0 ? 0.15 : -0.15), {
        viewX: event.clientX - rect.left,
        viewY: event.clientY - rect.top,
      });
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      frame.removeEventListener("wheel", onWheel);
    };
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const anchor = scrollAnchorRef.current;
    if (!frame || !anchor || anchor.fromZoom === zoom) {
      return;
    }
    const ratio = zoom / anchor.fromZoom;
    frame.scrollLeft = anchor.contentX * ratio - anchor.viewX;
    frame.scrollTop = anchor.contentY * ratio - anchor.viewY;
    scrollAnchorRef.current = null;
  }, [zoom]);

  function changeZoom(next: number, anchor?: { viewX: number; viewY: number }) {
    const frame = frameRef.current;
    const clamped = clampZoom(next);
    if (clamped === zoomRef.current) {
      return;
    }
    if (frame) {
      const viewX = anchor?.viewX ?? frame.clientWidth / 2;
      const viewY = anchor?.viewY ?? frame.clientHeight / 2;
      scrollAnchorRef.current = {
        contentX: frame.scrollLeft + viewX,
        contentY: frame.scrollTop + viewY,
        fromZoom: zoomRef.current,
        viewX,
        viewY,
      };
    }
    zoomRef.current = clamped;
    setZoom(clamped);
  }

  const pad = 16;

  function placeRing(event: ReactPointerEvent<HTMLCanvasElement>) {
    const ring = ringRef.current;
    const wrap = wrapRef.current;
    if (!ring || !wrap || !tool) {
      return;
    }
    const rect = wrap.getBoundingClientRect();
    ring.style.left = `${event.clientX - rect.left}px`;
    ring.style.top = `${event.clientY - rect.top}px`;
    ring.style.opacity = "1";
  }

  function hideRing() {
    if (ringRef.current && !drawingRef.current) {
      ringRef.current.style.opacity = "0";
    }
  }

  function canvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(rect.width, 1);
    const scaleY = canvas.height / Math.max(rect.height, 1);
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
      radius: Math.max(brush, 4) * scaleX,
    };
  }

  function paintLine(
    from: { x: number; y: number },
    to: { x: number; y: number },
    radius: number,
    mode: CutoutTool,
  ) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    if (mode === "erase") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = radius * 2;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const original = originalRef.current;
    const sourceCtx = original?.getContext("2d");
    if (!original || !sourceCtx) {
      return;
    }
    const sx = Math.max(0, Math.floor(Math.min(from.x, to.x) - radius));
    const sy = Math.max(0, Math.floor(Math.min(from.y, to.y) - radius));
    const ex = Math.min(canvas.width, Math.ceil(Math.max(from.x, to.x) + radius));
    const ey = Math.min(canvas.height, Math.ceil(Math.max(from.y, to.y) + radius));
    const width = ex - sx;
    const height = ey - sy;
    if (width <= 0 || height <= 0) {
      return;
    }
    const source = sourceCtx.getImageData(sx, sy, width, height);
    const dest = ctx.getImageData(sx, sy, width, height);
    const radiusSq = radius * radius;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSq = dx * dx + dy * dy;
    for (let py = 0; py < height; py += 1) {
      for (let px = 0; px < width; px += 1) {
        const cx = sx + px + 0.5;
        const cy = sy + py + 0.5;
        let nearestX = from.x;
        let nearestY = from.y;
        if (lengthSq > 0) {
          const t = Math.min(1, Math.max(0, ((cx - from.x) * dx + (cy - from.y) * dy) / lengthSq));
          nearestX = from.x + dx * t;
          nearestY = from.y + dy * t;
        }
        const offsetX = cx - nearestX;
        const offsetY = cy - nearestY;
        if (offsetX * offsetX + offsetY * offsetY > radiusSq) {
          continue;
        }
        const index = (py * width + px) * 4;
        dest.data[index] = source.data[index];
        dest.data[index + 1] = source.data[index + 1];
        dest.data[index + 2] = source.data[index + 2];
        dest.data[index + 3] = source.data[index + 3];
      }
    }
    ctx.putImageData(dest, sx, sy);
  }

  function commit() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.toBlob((blob) => {
      if (blob) {
        onChange(blob);
      }
    }, "image/png");
  }

  function selectTool(next: CutoutTool) {
    setTool((current) => (current === next ? null : next));
  }

  async function autoEraseFace() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || autoBusy) {
      return;
    }
    setAutoBusy(true);
    onError(null);
    try {
      const response = await fetch(sourceSrc);
      if (!response.ok) {
        throw new Error("원본 이미지를 불러오지 못했습니다.");
      }
      const blob = await response.blob();
      const face = await faceKeepAlpha(blob);
      const alpha = fitAlpha(face.alpha, face.width, face.height, canvas.width, canvas.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < alpha.length; index += 1) {
        const offset = index * 4 + 3;
        image.data[offset] = Math.min(image.data[offset] ?? 0, alpha[index] ?? 0);
      }
      ctx.putImageData(image, 0, 0);
      commit();
    } catch (cause) {
      onError(
        cause instanceof Error
          ? cause.message
          : "얼굴만 남기지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setAutoBusy(false);
    }
  }

  const ringDiameter = Math.max(brush, 4) * 2;
  const availableWidth = Math.max(1, frameSize.width - pad * 2);
  const availableHeight = Math.max(1, frameSize.height - pad * 2);
  const fit =
    imageSize.width > 0 && frameSize.width > 0
      ? Math.min(availableWidth / imageSize.width, availableHeight / imageSize.height)
      : 0;
  const displayWidth = fit ? Math.max(1, Math.round(imageSize.width * fit * zoom)) : 0;
  const displayHeight = fit ? Math.max(1, Math.round(imageSize.height * fit * zoom)) : 0;
  const contentWidth = Math.max(frameSize.width, displayWidth);
  const contentHeight = Math.max(frameSize.height, displayHeight);

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-[length:16px_16px] bg-[linear-gradient(45deg,#e7e5e4_25%,transparent_25%),linear-gradient(-45deg,#e7e5e4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e7e5e4_75%),linear-gradient(-45deg,transparent_75%,#e7e5e4_75%)] bg-[position:0_0,0_8px,8px_-8px,-8px_0] bg-white">
        <div ref={frameRef} className="h-72 w-full overflow-auto">
          <div className="relative" style={{ width: contentWidth || "100%", height: contentHeight || "100%" }}>
            <div
              ref={wrapRef}
              className="absolute"
              style={
                displayWidth
                  ? {
                      left: Math.max(0, (contentWidth - displayWidth) / 2),
                      top: Math.max(0, (contentHeight - displayHeight) / 2),
                      width: displayWidth,
                      height: displayHeight,
                    }
                  : { left: pad, top: pad, right: pad, bottom: pad }
              }
            >
              <canvas
                ref={canvasRef}
                aria-label="분리한 캐릭터 머리"
                onPointerDown={(event) => {
                  if (disabled || autoBusy) {
                    return;
                  }
                  const frame = frameRef.current;
                  if (!tool) {
                    if (!frame || zoomRef.current <= 1) {
                      return;
                    }
                    try {
                      event.currentTarget.setPointerCapture(event.pointerId);
                    } catch {
                      // Some browsers reject capture for this pointer.
                    }
                    panRef.current = {
                      x: event.clientX,
                      y: event.clientY,
                      left: frame.scrollLeft,
                      top: frame.scrollTop,
                    };
                    return;
                  }
                  try {
                    event.currentTarget.setPointerCapture(event.pointerId);
                  } catch {
                    // Some browsers reject capture for this pointer.
                  }
                  placeRing(event);
                  const point = canvasPoint(event);
                  drawingRef.current = true;
                  lastRef.current = point;
                  paintLine(point, point, point.radius, tool);
                }}
                onPointerMove={(event) => {
                  if (panRef.current && frameRef.current) {
                    frameRef.current.scrollLeft = panRef.current.left - (event.clientX - panRef.current.x);
                    frameRef.current.scrollTop = panRef.current.top - (event.clientY - panRef.current.y);
                    return;
                  }
                  placeRing(event);
                  if (!drawingRef.current || !lastRef.current || !tool) {
                    return;
                  }
                  const point = canvasPoint(event);
                  paintLine(lastRef.current, point, point.radius, tool);
                  lastRef.current = point;
                }}
                onPointerUp={() => {
                  panRef.current = null;
                  if (!drawingRef.current) {
                    return;
                  }
                  drawingRef.current = false;
                  lastRef.current = null;
                  commit();
                }}
                onPointerCancel={() => {
                  panRef.current = null;
                  const painted = drawingRef.current;
                  drawingRef.current = false;
                  lastRef.current = null;
                  hideRing();
                  if (painted) {
                    commit();
                  }
                }}
                onPointerLeave={hideRing}
                className={`block h-full w-full select-none ${tool ? "touch-none" : ""}`}
                style={{ cursor: tool ? "none" : zoom > 1 ? "grab" : "default" }}
              />
              <div
                ref={ringRef}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 rounded-full opacity-0"
                style={{
                  width: ringDiameter,
                  height: ringDiameter,
                  transform: "translate(-50%, -50%)",
                  border: tool === "restore" ? "2px solid #059669" : "2px solid #1c1917",
                  boxShadow: "0 0 0 1px #ffffff",
                  background:
                    tool === "restore" ? "rgba(5, 150, 105, 0.16)" : "rgba(28, 25, 23, 0.08)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-stone-600">
        <button
          type="button"
          aria-label="축소"
          onClick={() => changeZoom(zoom - 0.25)}
          disabled={disabled || autoBusy || zoom <= MIN_ZOOM}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-lg font-medium text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          −
        </button>
        <label className="flex min-w-0 flex-1 items-center gap-3">
          <span className="shrink-0">확대</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            aria-label="확대 축소"
            onChange={(event) => changeZoom(Number(event.target.value))}
            className="min-w-0 flex-1"
          />
        </label>
        <button
          type="button"
          aria-label="확대"
          onClick={() => changeZoom(zoom + 0.25)}
          disabled={disabled || autoBusy || zoom >= MAX_ZOOM}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-lg font-medium text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={() => void autoEraseFace()}
        disabled={disabled || autoBusy}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {autoBusy ? "얼굴만 남기는 중..." : "자동 지우개"}
      </button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={tool === "erase"}
          onClick={() => selectTool("erase")}
          disabled={disabled || autoBusy}
          className={
            tool === "erase"
              ? "flex h-12 items-center justify-center rounded-xl bg-stone-800 px-4 text-sm font-medium text-white"
              : "flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-50"
          }
        >
          {tool === "erase" ? "지우개 사용 중" : "지우개"}
        </button>
        <button
          type="button"
          aria-pressed={tool === "restore"}
          onClick={() => selectTool("restore")}
          disabled={disabled || autoBusy}
          className={
            tool === "restore"
              ? "flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white"
              : "flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-50"
          }
        >
          {tool === "restore" ? "되돌리는 중" : "되돌리기"}
        </button>
      </div>
      {tool ? (
        <label className="mt-3 flex items-center gap-3 text-sm text-stone-600">
          크기
          <input
            type="range"
            min={12}
            max={64}
            value={brush}
            onChange={(event) => setBrush(Number(event.target.value))}
            className="w-full"
          />
        </label>
      ) : null}
      <p className="mt-3 text-sm text-stone-500">
        {tool === "erase"
          ? "동그라미 안이 지워져요."
          : tool === "restore"
            ? "동그라미 안이 자르기 전 원본으로 돌아와요."
            : "자동 지우개는 얼굴만 남기고, 지우개와 되돌리기는 원으로 직접 고쳐요."}
      </p>
    </div>
  );
}

export function PhotoFaceStickerPanel({
  characterImageSrc,
  onUseCutout,
}: {
  characterImageSrc: string | null;
  onUseCutout: (imagePath: string) => void;
}) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl);
      }
    };
  }, [sourceUrl]);

  async function cutoutFromBlob(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const { cutout, source } = await cutoutHeadPng(blob);
      setPreviewBlob(cutout);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(cutout);
      });
      setSourceUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(source);
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "얼굴을 분리하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadCharacterImage() {
    if (!characterImageSrc) {
      setError("선택한 캐릭터 이미지가 없습니다.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(originalCharacterImageSrc(characterImageSrc));
      if (!response.ok) {
        throw new Error("캐릭터 이미지를 불러오지 못했습니다.");
      }
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("캐릭터 이미지를 불러오지 못했습니다.");
      }
      await cutoutFromBlob(blob);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "캐릭터 이미지를 불러오지 못했습니다.",
      );
      setBusy(false);
    }
  }

  async function applyCutout() {
    if (!previewBlob) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("image", new File([previewBlob], "photo-face.png", { type: "image/png" }));
      const response = await fetch("/api/stickers/photo-face", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json().catch(() => null)) as {
        imagePath?: string;
        error?: string;
      } | null;
      if (!response.ok || !payload?.imagePath) {
        throw new Error(payload?.error ?? "얼굴 이미지를 저장하지 못했습니다.");
      }
      onUseCutout(payload.imagePath);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "얼굴 이미지를 저장하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  function resetPreview() {
    setPreviewBlob(null);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setSourceUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setError(null);
  }

  if (previewUrl) {
    return (
      <section>
        <h2 className="text-lg font-semibold">머리만 남겼어요</h2>
        <p className="mt-1 text-sm text-stone-500">
          자동 지우개로 얼굴만 남기고, 남은 곳은 지우개로 지우거나 되돌리기로 원본을 칠해요.
        </p>
        <div className="mt-4">
          {sourceUrl ? (
            <CutoutEraser
              src={previewUrl}
              sourceSrc={sourceUrl}
              disabled={busy}
              onChange={setPreviewBlob}
              onError={setError}
            />
          ) : null}
        </div>
        {error ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={resetPreview}
            disabled={busy}
            className="flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            다시 맞추기
          </button>
          <button
            type="button"
            onClick={() => void applyCutout()}
            disabled={busy}
            className="flex h-12 items-center justify-center rounded-xl bg-sky-400 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "저장 중..." : "이 얼굴로 만들기"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">선택한 캐릭터에서 머리만 남길게요</h2>
      <p className="mt-1 text-sm text-stone-500">
        캐릭터 그림에서 배경과 목을 지우고 머리만 남겨요.
        다른 사진을 쓰려면 아래에 올려 주세요.
      </p>
      <button
        type="button"
        onClick={() => void loadCharacterImage()}
        disabled={busy || !characterImageSrc}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "얼굴을 분리하는 중..." : "선택한 캐릭터로 머리만 남기기"}
      </button>
      <p className="my-4 text-center text-sm text-stone-400">또는 새 사진</p>
      <CharacterPhotoPicker disabled={busy} onPhotoChange={setPhotoFile} />
      {photoFile ? (
        <button
          type="button"
          onClick={() => void cutoutFromBlob(photoFile)}
          disabled={busy}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-sky-300 bg-sky-50 text-sm font-medium text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "얼굴을 분리하는 중..." : "이 사진으로 머리만 남기기"}
        </button>
      ) : null}
      {busy ? (
        <p className="mt-3 text-center text-sm text-stone-500">
          처음에는 얼굴 분리 모델을 받아 와서 조금 걸릴 수 있어요.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </section>
  );
}
