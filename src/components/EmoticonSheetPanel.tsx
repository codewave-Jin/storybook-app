"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppImage } from "@/components/AppImage";
import { CharacterPhotoPicker } from "@/components/CharacterPhotoPicker";
import { PreviewWatermark } from "@/components/PreviewWatermark";
import { TokenConfirmDialog } from "@/components/StickerTokenConfirmDialog";
import {
  EMOTICON_THEMES,
  emoticonDownloadName,
  type EmoticonAgeUnit,
  type EmoticonThemeId,
} from "@/lib/emoticon-prompt";
import { estimatedGenerationPercent } from "@/lib/generation-progress-estimate";
import { toProtectedMediaSrc } from "@/lib/media-paths";
import { EMOTICON_PACK_TOKENS, formatTokens } from "@/lib/payments";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";

export type EmoticonCharacterOption = {
  id: string;
  label: string;
  imageSrc: string;
};

type EmoticonSource = "photo" | "character";

export type EmoticonPreview = {
  orderId: string;
  paid: boolean;
  themeLabel: string;
  cells: { key: string; caption: string; imageUrl: string }[];
};

export function EmoticonSheetPanel({
  characters,
  tokenBalance,
}: {
  characters: EmoticonCharacterOption[];
  tokenBalance: number;
}) {
  const router = useRouter();
  const [source, setSource] = useState<EmoticonSource | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [theme, setTheme] = useState<EmoticonThemeId>("basic");
  const [useAge, setUseAge] = useState(false);
  const [age, setAge] = useState("3");
  const [ageUnit, setAgeUnit] = useState<EmoticonAgeUnit>("months");
  const [generating, setGenerating] = useState(false);
  const [tokenConfirmOpen, setTokenConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchAfterRef = useRef<string | null>(null);
  const ready = source === "photo" ? Boolean(file) : Boolean(characterId);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function chooseSource(next: EmoticonSource) {
    setSource(next);
    setError(null);
    if (next === "photo") {
      setCharacterId(null);
    } else {
      clearPhoto();
    }
  }

  function resetSource() {
    setSource(null);
    setCharacterId(null);
    clearPhoto();
    setError(null);
    router.replace("/dashboard/emoticon");
  }

  function clearPhoto() {
    setFile(null);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }

  function setPhotoFile(next: File | null) {
    setError(null);
    setFile(next);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return next ? URL.createObjectURL(next) : null;
    });
  }

  function validateBeforeGenerate() {
    if (generating) {
      return false;
    }
    if (source === "photo" && !file) {
      setError("실제 사진을 올려 주세요.");
      return false;
    }
    if (source === "character" && !characterId) {
      setError("만든 캐릭터를 골라 주세요.");
      return false;
    }
    if (!source) {
      setError("실제 사진 또는 만든 캐릭터를 먼저 골라 주세요.");
      return false;
    }
    if (useAge && !/^\d+$/.test(age.trim())) {
      setError("나이는 숫자로 입력해 주세요.");
      return false;
    }
    if (tokenBalance < 1) {
      setError("토큰이 부족합니다");
      return false;
    }
    setError(null);
    return true;
  }

  function requestGenerate() {
    if (!validateBeforeGenerate()) {
      return;
    }
    setTokenConfirmOpen(true);
  }

  useEffect(() => {
    const after = watchAfterRef.current;
    if (!generating || !after) {
      return;
    }
    let stopped = false;
    async function lookForOrder() {
      if (stopped) {
        return;
      }
      try {
        const response = await fetch(
          `/api/emoticons/latest?after=${encodeURIComponent(after ?? "")}`,
        );
        const payload = (await response.json().catch(() => null)) as {
          orderId?: string | null;
        } | null;
        if (!stopped && payload?.orderId) {
          stopped = true;
          router.push(`/dashboard/emoticon/${payload.orderId}`);
        }
      } catch {
        // The create request can finish on the server after the phone drops it.
      }
    }
    void lookForOrder();
    const timer = window.setInterval(() => {
      void lookForOrder();
    }, 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [generating, router]);

  async function generate() {
    if (!validateBeforeGenerate()) {
      setTokenConfirmOpen(false);
      return;
    }

    setTokenConfirmOpen(false);
    watchAfterRef.current = new Date(Date.now() - 5000).toISOString();
    setGenerating(true);
    setError(null);
    try {
      const body = new FormData();
      if (source === "character" && characterId) {
        body.set("characterId", characterId);
      } else if (file) {
        body.set("referenceImage", file);
      }
      body.set("theme", theme);
      if (useAge) {
        body.set("age", age.trim());
        body.set("ageUnit", ageUnit);
      }
      const response = await fetch("/api/emoticons/generate", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as {
        orderId?: string;
        paid?: boolean;
        cells?: EmoticonPreview["cells"];
        error?: string;
      } | null;
      if (!response.ok) {
        setError(payload?.error ?? "이모티콘을 만들지 못했습니다.");
        setGenerating(false);
        return;
      }
      if (!payload?.orderId || !payload.cells?.length) {
        window.setTimeout(() => {
          setGenerating((current) => {
            if (current) {
              setError("이모티콘을 만들지 못했습니다. 최근 작업에서 미리보기를 확인해 주세요.");
            }
            return false;
          });
        }, 30000);
        return;
      }
      router.push(`/dashboard/emoticon/${payload.orderId}`);
    } catch {
      window.setTimeout(() => {
        setGenerating((current) => {
          if (current) {
            setError("이모티콘을 만들지 못했습니다. 최근 작업에서 미리보기를 확인해 주세요.");
          }
          return false;
        });
      }, 120000);
    }
  }

  if (generating) {
    const faceSrc =
      source === "photo"
        ? previewUrl
        : characters.find((character) => character.id === characterId)?.imageSrc ?? null;
    return <EmoticonGenerating imageSrc={faceSrc} />;
  }

  if (!source) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <p className="text-sm leading-relaxed text-stone-600">
          같은 얼굴로 3×3 이모티콘을 만듭니다. 먼저 어떤 얼굴을 쓸지 골라 주세요.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => chooseSource("photo")}
            className="rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm hover:border-sky-300 hover:bg-sky-50"
          >
            <p className="text-base font-semibold text-stone-800">실제 사진</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-500">
              올린 사진의 얼굴과 분위기를 유지합니다.
            </p>
          </button>
          <button
            type="button"
            onClick={() => chooseSource("character")}
            className="rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm hover:border-sky-300 hover:bg-sky-50"
          >
            <p className="text-base font-semibold text-stone-800">만든 캐릭터</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-500">
              이미 만든 캐릭터의 그림체를 유지합니다.
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      {source ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-stone-800">
            {source === "photo" ? "실제 사진" : "만든 캐릭터"}
          </p>
          <button
            type="button"
            onClick={resetSource}
            disabled={generating}
            className="text-sm font-medium text-stone-500 hover:underline disabled:opacity-40"
          >
            다시 고르기
          </button>
        </div>
      ) : null}

      {source ? (
      <>
      {source === "photo" ? (
        <div className="mt-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
          <p className="text-center text-base font-bold leading-snug text-stone-900">
            눈, 코, 입이 잘 보이도록 정면 사진을 올려주세요
          </p>
          <div className="mt-3">
            <CharacterPhotoPicker
              disabled={generating}
              hideHeading
              accept={ACCEPT}
              guideText="눈, 코, 입이 잘 보이게 정면을 원 안에 맞춰 주세요"
              albumHint="눈, 코, 입이 잘 보이도록 정면으로 맞춰 주세요"
              onPhotoChange={setPhotoFile}
            />
          </div>
        </div>
      ) : characters.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
          <p className="font-medium text-stone-800">완성된 캐릭터가 없어요</p>
          <p className="mt-1 text-sm text-stone-500">먼저 캐릭터를 만든 뒤 골라 주세요.</p>
          <Link
            href="/dashboard/characters/new"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-sky-400 px-5 text-sm font-semibold text-white"
          >
            캐릭터 만들러 가기
          </Link>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {characters.map((character) => {
            const selected = characterId === character.id;
            return (
              <button
                key={character.id}
                type="button"
                disabled={generating}
                onClick={() => {
                  setCharacterId(character.id);
                  setError(null);
                }}
                className={cn(
                  "overflow-hidden rounded-xl border bg-white text-left shadow-sm disabled:opacity-60",
                  selected ? "border-sky-400 ring-2 ring-sky-300" : "border-stone-200",
                )}
              >
                <span className="relative block aspect-square bg-stone-100">
                  <AppImage
                    src={character.imageSrc}
                    alt={character.label}
                    fill
                    className="object-cover"
                    sizes="72px"
                  />
                </span>
                <span className="block truncate px-1 py-1 text-center text-[11px] font-semibold leading-tight text-stone-800">
                  {character.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3">
        <p className="text-base font-semibold text-stone-800">테마</p>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
          얼굴은 그대로 두고, 고른 테마에 맞는 옷과 문구로 만듭니다.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {EMOTICON_THEMES.map((option) => {
            const selected = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                disabled={generating}
                onClick={() => {
                  setTheme(option.id);
                  setError(null);
                }}
                className={cn(
                  "min-h-16 rounded-2xl border px-3 py-3 text-left disabled:opacity-60",
                  selected
                    ? "border-sky-400 bg-sky-50 ring-2 ring-sky-300"
                    : "border-stone-200 bg-white hover:border-sky-300",
                )}
              >
                <span className="block text-base font-semibold text-stone-800">{option.label}</span>
                <span className="mt-0.5 block text-sm leading-snug text-stone-500">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <label className="flex items-center gap-2 text-sm font-medium text-stone-800">
          <input
            type="checkbox"
            checked={useAge}
            disabled={generating}
            onChange={(event) => setUseAge(event.target.checked)}
            className="h-4 w-4 accent-sky-400"
          />
          나이를 반영할게요
        </label>
        {useAge ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={age}
              disabled={generating}
              onChange={(event) => setAge(event.target.value)}
              aria-label="나이"
              className="h-10 w-24 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
            />
            <select
              value={ageUnit}
              disabled={generating}
              onChange={(event) => setAgeUnit(event.target.value as EmoticonAgeUnit)}
              aria-label="나이 단위"
              className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
            >
              <option value="months">개월</option>
              <option value="years">세</option>
            </select>
          </div>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            입력하지 않으면 원본에서 보이는 연령과 외형을 유지합니다.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={requestGenerate}
        disabled={generating || !ready}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-sky-400 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
      >
        이모티콘 만들기
      </button>
      <p className="mt-2 text-center text-sm text-stone-500">
        미리보기를 만들면 토큰 1개가 사용되고, 결제하면 다시 돌려드려요. 현재 토큰 {tokenBalance}개
      </p>
      </>
      ) : null}
      {error ? <p className="mt-2 text-center text-sm text-red-500">{error}</p> : null}
      <TokenConfirmDialog
        open={tokenConfirmOpen}
        tokens={tokenBalance}
        description="미리보기를 만들면 토큰 1개가 사용돼요. 결제하면 다시 돌려드려요."
        pendingLabel="이모티콘 만드는 중..."
        onClose={() => setTokenConfirmOpen(false)}
        onConfirm={() => void generate()}
      />
    </div>
  );
}

function EmoticonGenerating({ imageSrc }: { imageSrc: string | null }) {
  const [percent, setPercent] = useState(12);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsedSec = (Date.now() - started) / 1000;
      setPercent(estimatedGenerationPercent(elapsedSec, "sticker"));
    }, 400);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-stone-200">
        <div className="relative mx-auto h-52 w-52 overflow-hidden rounded-full bg-stone-100 ring-1 ring-stone-200">
          {imageSrc ? (
            imageSrc.startsWith("blob:") ? (
              <img src={imageSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <AppImage src={imageSrc} alt="" fill className="object-cover" sizes="208px" />
            )
          ) : null}
        </div>
        <p className="mt-6 text-lg font-semibold text-stone-800">이모티콘을 만들고 있어요</p>
        <p className="mt-2 text-sm text-stone-500">같은 얼굴로 9장을 그리는 중이에요. 1~2분 정도 걸려요.</p>
        <div
          className="mx-auto mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-stone-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-medium text-stone-500">{percent}%</p>
      </div>
    </div>
  );
}

export function EmoticonResultPanel({
  initialPreview,
  tokenBalance,
}: {
  initialPreview: EmoticonPreview;
  tokenBalance: number;
}) {
  const [preview, setPreview] = useState(initialPreview);
  const [tokens, setTokens] = useState(tokenBalance);
  const [cellIndex, setCellIndex] = useState(0);
  const [paying, setPaying] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (paying) {
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const response = await fetch(`/api/emoticons/${preview.orderId}/pay`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        paid?: boolean;
        tokens?: number;
      } | null;
      if (!response.ok || !payload?.paid) {
        setError(payload?.error ?? "토큰을 사용하지 못했습니다.");
        return;
      }
      if (typeof payload.tokens === "number") {
        setTokens(payload.tokens);
      } else {
        setTokens((current) => Math.max(0, current - EMOTICON_PACK_TOKENS));
      }
      setPreview({ ...preview, paid: true });
      setPayOpen(false);
    } catch {
      setError("토큰을 사용하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <EmoticonViewer
        preview={preview}
        index={cellIndex}
        onIndexChange={setCellIndex}
        onPay={() => setPayOpen(true)}
      />
      {error ? <p className="mt-2 text-center text-sm text-red-500">{error}</p> : null}
      <TokenConfirmDialog
        open={payOpen}
        tokens={tokens}
        pending={paying}
        pendingLabel="사용 중..."
        pendingMessage="토큰을 사용하고 있어요. 잠시만 기다려 주세요."
        description={`${formatTokens(EMOTICON_PACK_TOKENS)}이 사용돼요. 미리보기에 쓴 토큰 1개는 결제하면 다시 돌아와요.`}
        confirmLabel={tokens < EMOTICON_PACK_TOKENS ? "토큰이 부족합니다" : "수락"}
        confirmDisabled={tokens < EMOTICON_PACK_TOKENS}
        onClose={() => {
          if (!paying) {
            setPayOpen(false);
          }
        }}
        onConfirm={() => void pay()}
      />
    </div>
  );
}

function EmoticonViewer({
  preview,
  index,
  onIndexChange,
  onPay,
}: {
  preview: EmoticonPreview;
  index: number;
  onIndexChange: (index: number) => void;
  onPay: () => void;
}) {
  const total = preview.cells.length;
  const current = preview.cells[Math.min(index, total - 1)] ?? preview.cells[0];
  const position = preview.cells.indexOf(current);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function downloadAll() {
    if (downloadingAll || preview.cells.length === 0) {
      return;
    }
    setDownloadingAll(true);
    setDownloadError(null);
    try {
      const files = await Promise.all(
        preview.cells.map(async (cell, cellPosition) => {
          const response = await fetch(
            `/api/emoticons/${preview.orderId}/download?index=${cellPosition}`,
          );
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? "전체 다운로드에 실패했습니다.");
          }
          const blob = await response.blob();
          if (!blob.type.startsWith("image/")) {
            throw new Error("이모티콘 파일을 받지 못했습니다.");
          }
          return {
            blob,
            filename: emoticonDownloadName(cellPosition, cell.caption),
          };
        }),
      );
      files.forEach((file, index) => {
        window.setTimeout(() => {
          const url = URL.createObjectURL(file.blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = file.filename;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 2000);
          if (index === files.length - 1) {
            setDownloadingAll(false);
          }
        }, index * 300);
      });
    } catch (downloadFailure) {
      setDownloadError(
        downloadFailure instanceof Error
          ? downloadFailure.message
          : "전체 다운로드에 실패했습니다.",
      );
      setDownloadingAll(false);
    }
  }

  function step(delta: number) {
    onIndexChange((position + delta + total) % total);
  }

  if (!current) {
    return null;
  }

  if (!preview.paid) {
    return (
      <div className="mt-5 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-stone-800">미리보기</p>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          {preview.themeLabel} 테마 9장을 3×3으로 확인할 수 있어요. 결제하면 미리보기 토큰 1개가 돌아오고, 한 장씩 크게 보고 각각 받을 수 있습니다.
        </p>
        <div className="relative mt-3 overflow-hidden rounded-2xl bg-white">
          <div className="grid grid-cols-3 gap-px">
            {preview.cells.map((cell) => (
              <img
                key={cell.key}
                src={toProtectedMediaSrc(cell.imageUrl)}
                alt={cell.caption}
                className="aspect-square w-full bg-white object-contain"
              />
            ))}
          </div>
          <PreviewWatermark placement="center" size="lg" />
        </div>
        <button
          type="button"
          onClick={onPay}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-full bg-[#E07A5F] text-sm font-semibold text-white hover:bg-[#d56c51]"
        >
          {formatTokens(EMOTICON_PACK_TOKENS)} 사용하고 한 장씩 받기
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-stone-800">받은 이모티콘 · {preview.themeLabel}</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        화살표로 한 장씩 넘겨 크게 보고, 보고 있는 장이나 9장 전체를 받을 수 있어요.
      </p>
      <img
        src={toProtectedMediaSrc(current.imageUrl)}
        alt={current.caption}
        className="mt-3 aspect-square w-full rounded-2xl bg-stone-50 object-contain"
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="이전 이모티콘"
          onClick={() => step(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 text-lg text-stone-700 hover:bg-stone-50"
        >
          ‹
        </button>
        <p className="text-center text-sm font-medium text-stone-800">
          {position + 1} / {total}
          <span className="mt-0.5 block text-xs font-normal text-stone-500">{current.caption}</span>
        </p>
        <button
          type="button"
          aria-label="다음 이모티콘"
          onClick={() => step(1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 text-lg text-stone-700 hover:bg-stone-50"
        >
          ›
        </button>
      </div>
      <div className="mt-3 grid grid-cols-9 gap-1">
        {preview.cells.map((cell, cellPosition) => {
          const selected = cellPosition === position;
          return (
            <button
              key={cell.key}
              type="button"
              aria-label={`${cellPosition + 1}번째 ${cell.caption}`}
              aria-current={selected ? "true" : undefined}
              onClick={() => onIndexChange(cellPosition)}
              className={cn(
                "overflow-hidden rounded-md border bg-stone-50",
                selected ? "border-sky-400 ring-2 ring-sky-300" : "border-transparent",
              )}
            >
              <img
                src={toProtectedMediaSrc(cell.imageUrl)}
                alt=""
                className="aspect-square w-full object-contain"
              />
            </button>
          );
        })}
      </div>
      <a
        href={`/api/emoticons/${preview.orderId}/download?index=${position}`}
        className="mt-3 flex h-11 items-center justify-center rounded-full bg-sky-400 text-sm font-semibold text-white hover:bg-sky-500"
      >
        이 장 다운로드
      </a>
      <button
        type="button"
        onClick={() => void downloadAll()}
        disabled={downloadingAll}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-full border border-sky-300 bg-white text-sm font-semibold text-sky-600 hover:bg-sky-50 disabled:opacity-50"
      >
        {downloadingAll ? "전체 받는 중..." : "전체 다운로드"}
      </button>
      {downloadError ? <p className="mt-2 text-center text-sm text-red-500">{downloadError}</p> : null}
    </div>
  );
}
