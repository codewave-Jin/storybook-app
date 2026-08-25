"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  cropCanvasToSquareFile,
  getCoverGuideCrop,
  getCroppedImageFile,
} from "@/lib/crop-image";

const GUIDE_RATIO = 0.72;

type Mode = "camera" | "album";
type CameraPhase = "live" | "preview";
type AlbumPhase = "pick" | "crop" | "preview";
type CameraError = "permission" | "unsupported" | "insecure" | "notfound";

function assignFileToInput(input: HTMLInputElement | null, file: File | null) {
  if (!input) {
    return;
  }
  if (!file) {
    input.value = "";
    return;
  }
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function cameraErrorMessage(error: CameraError) {
  switch (error) {
    case "permission":
      return "카메라 권한이 거부되었습니다. 브라우저 설정에서 허용하거나 앨범에서 선택해 주세요.";
    case "insecure":
      return "카메라 촬영은 보안 연결(HTTPS) 또는 localhost에서만 사용할 수 있습니다. 앨범에서 선택해 주세요.";
    case "notfound":
      return "사용 가능한 카메라를 찾지 못했습니다. 앨범에서 선택해 주세요.";
    default:
      return "이 브라우저에서는 카메라를 사용할 수 없습니다. 앨범에서 선택해 주세요.";
  }
}

export function CharacterPhotoPicker({
  disabled,
  onPhotoChange,
}: {
  disabled?: boolean;
  onPhotoChange?: (file: File | null) => void;
}) {
  const maskId = useId().replace(/:/g, "");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<Mode>("camera");
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>("live");
  const [albumPhase, setAlbumPhase] = useState<AlbumPhase>("pick");
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [albumSrc, setAlbumSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [cameraSession, setCameraSession] = useState(0);

  useEffect(() => {
    if (!reviewFile) {
      setReviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(reviewFile);
    setReviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [reviewFile]);

  useEffect(() => {
    return () => {
      if (albumSrc) {
        URL.revokeObjectURL(albumSrc);
      }
    };
  }, [albumSrc]);

  const stopCamera = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    const shouldRun = mode === "camera" && cameraPhase === "live" && !disabled;
    if (!shouldRun) {
      stopCamera();
      return;
    }

    let cancelled = false;
    setCameraError(null);
    setCameraReady(false);

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraError(
            typeof window !== "undefined" && !window.isSecureContext
              ? "insecure"
              : "unsupported",
          );
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
        });

        if (cancelled) {
          stopStream(stream);
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stopStream(stream);
          streamRef.current = null;
          return;
        }
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play().catch(() => undefined);
        if (cancelled) {
          stopStream(stream);
          streamRef.current = null;
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
          return;
        }
        setCameraReady(true);
      } catch (caught) {
        if (cancelled) {
          return;
        }
        stopCamera();
        const name = caught instanceof DOMException ? caught.name : "";
        const host = window.location.hostname;
        const isLocal =
          host === "localhost" || host === "127.0.0.1" || host === "[::1]";
        if (!window.isSecureContext && !isLocal) {
          setCameraError("insecure");
          return;
        }
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setCameraError("permission");
          return;
        }
        if (name === "NotFoundError" || name === "OverconstrainedError") {
          setCameraError("notfound");
          return;
        }
        setCameraError("unsupported");
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [mode, cameraPhase, disabled, cameraSession, stopCamera]);

  const clearAlbumSrc = useCallback(() => {
    setAlbumSrc((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    if (albumInputRef.current) {
      albumInputRef.current.value = "";
    }
  }, []);

  function setPhotoFile(file: File | null) {
    assignFileToInput(photoInputRef.current, file);
    onPhotoChange?.(file);
  }

  function switchMode(next: Mode) {
    if (next === mode) {
      return;
    }
    setError(null);
    setBusy(false);
    setReviewFile(null);
    setPhotoFile(null);
    setCameraPhase("live");
    setAlbumPhase("pick");
    clearAlbumSrc();
    setMode(next);
  }

  async function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("카메라를 아직 준비 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const region = getCoverGuideCrop(
        video.videoWidth,
        video.videoHeight,
        video.clientWidth,
        video.clientHeight,
        GUIDE_RATIO,
      );
      const file = await cropCanvasToSquareFile(
        video,
        region.x,
        region.y,
        region.size,
      );
      setReviewFile(file);
      setPhotoFile(file);
      setCameraPhase("preview");
    } catch {
      setError("촬영에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function onAlbumFiles(files: FileList | null) {
    const next = files?.[0];
    if (!next || (next.type && !next.type.startsWith("image/"))) {
      setError("이미지 파일만 선택할 수 있습니다.");
      return;
    }

    setError(null);
    setReviewFile(null);
    setPhotoFile(null);
    setAlbumSrc((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(next);
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setAlbumPhase("crop");
  }

  async function applyAlbumCrop() {
    if (!albumSrc || !croppedAreaPixels) {
      setError("자를 영역을 먼저 맞춰 주세요.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const file = await getCroppedImageFile(albumSrc, croppedAreaPixels);
      setReviewFile(file);
      setPhotoFile(file);
      setAlbumPhase("preview");
    } catch {
      setError("사진을 자르지 못했습니다. 다른 이미지를 선택해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function retakeCamera() {
    setReviewFile(null);
    setPhotoFile(null);
    setCameraPhase("live");
  }

  function reselectAlbum() {
    setReviewFile(null);
    setPhotoFile(null);
    clearAlbumSrc();
    setAlbumPhase("pick");
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-stone-700">사진</p>

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="사진 입력 방식">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "camera"}
          disabled={disabled}
          onClick={() => switchMode("camera")}
          className={`flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition ${
            mode === "camera"
              ? "border-sky-400 bg-sky-400 text-white"
              : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
          }`}
        >
          사진 촬영
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "album"}
          disabled={disabled}
          onClick={() => switchMode("album")}
          className={`flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition ${
            mode === "album"
              ? "border-sky-400 bg-sky-400 text-white"
              : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
          }`}
        >
          앨범에서 선택
        </button>
      </div>

      <input
        ref={photoInputRef}
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        required
        className="sr-only"
        tabIndex={-1}
        aria-label="선택한 얼굴 사진"
      />

      {mode === "camera" ? (
        <div className="space-y-3">
          {cameraError ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-6 text-center">
              <p className="text-sm text-stone-600">{cameraErrorMessage(cameraError)}</p>
              <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setCameraError(null);
                    setCameraSession((value) => value + 1);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-50"
                >
                  다시 시도
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("album")}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-400 px-4 text-sm font-medium text-white"
                >
                  앨범에서 선택
                </button>
              </div>
            </div>
          ) : cameraPhase === "preview" && reviewUrl ? (
            <PreviewCard
              src={reviewUrl}
              retryLabel="다시 찍기"
              onRetry={retakeCamera}
            />
          ) : (
            <>
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-900">
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
                  autoPlay
                  muted
                  playsInline
                  aria-label="카메라 미리보기"
                />
                <div className="pointer-events-none absolute inset-0">
                  <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
                    <defs>
                      <mask id={maskId}>
                        <rect width="100" height="100" fill="white" />
                        <circle cx="50" cy="50" r={GUIDE_RATIO * 50} fill="black" />
                      </mask>
                    </defs>
                    <rect
                      width="100"
                      height="100"
                      fill="rgba(0,0,0,0.55)"
                      mask={`url(#${maskId})`}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={GUIDE_RATIO * 50}
                      fill="none"
                      stroke="white"
                      strokeWidth="0.7"
                    />
                  </svg>
                  <p className="absolute inset-x-0 bottom-4 px-4 text-center text-sm font-medium text-white drop-shadow">
                    얼굴이 원에 가득 차게 맞춰주세요
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void captureFrame()}
                disabled={disabled || busy || !cameraReady}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 text-base font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "처리 중..." : "촬영"}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            ref={albumInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="앨범에서 사진 선택"
            onChange={(event) => onAlbumFiles(event.target.files)}
          />

          {albumPhase === "crop" && albumSrc ? (
            <>
              <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-slate-900 sm:h-80">
                <Cropper
                  image={albumSrc}
                  crop={crop}
                  zoom={zoom}
                  minZoom={1}
                  maxZoom={3}
                  rotation={0}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  zoomWithScroll
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
                />
                <p className="pointer-events-none absolute inset-x-0 bottom-4 z-10 px-4 text-center text-sm font-medium text-white drop-shadow">
                  얼굴이 원에 가득 차게 맞춰주세요
                </p>
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
                확대 / 축소
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full accent-sky-400"
                  aria-label="사진 확대"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={reselectAlbum}
                  className="flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-medium text-stone-800 hover:bg-stone-50"
                >
                  다시 선택
                </button>
                <button
                  type="button"
                  onClick={() => void applyAlbumCrop()}
                  disabled={busy || !croppedAreaPixels}
                  className="flex h-12 items-center justify-center rounded-xl bg-sky-400 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "처리 중..." : "적용"}
                </button>
              </div>
            </>
          ) : albumPhase === "preview" && reviewUrl ? (
            <PreviewCard
              src={reviewUrl}
              retryLabel="다시 선택"
              onRetry={reselectAlbum}
            />
          ) : (
            <button
              type="button"
              onClick={() => albumInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                onAlbumFiles(event.dataTransfer.files);
              }}
              className={`flex min-h-48 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
                dragActive
                  ? "border-sky-400 bg-sky-50"
                  : "border-stone-300 bg-white hover:border-sky-400 hover:bg-sky-50"
              }`}
            >
              <span className="space-y-1 text-sm text-stone-500">
                <span className="block font-medium text-stone-700">
                  사진을 드래그하거나 눌러서 선택
                </span>
                <span className="block">얼굴이 원에 가득 차도록 맞춰 주세요</span>
                <span className="block">JPG, PNG, WEBP · 최대 5MB</span>
              </span>
            </button>
          )}
        </div>
      )}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}

function PreviewCard({
  src,
  retryLabel,
  onRetry,
}: {
  src: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="선택한 얼굴 미리보기"
          className="h-52 w-52 rounded-full object-cover ring-2 ring-white shadow-sm"
        />
        <p className="text-sm font-medium text-stone-700">이 사진이 선택되었습니다</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex h-12 w-full items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-medium text-stone-800 hover:bg-stone-50"
      >
        {retryLabel}
      </button>
    </div>
  );
}
