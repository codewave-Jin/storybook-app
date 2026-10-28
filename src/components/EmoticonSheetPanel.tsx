"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppImage } from "@/components/AppImage";
import type { EmoticonAgeUnit } from "@/lib/emoticon-prompt";
import { estimatedGenerationPercent } from "@/lib/generation-progress-estimate";
import { toProtectedMediaSrc } from "@/lib/media-paths";
import { EMOTICON_PACK_PRICE_KRW, formatKrw } from "@/lib/payments";
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
  cells: { key: string; caption: string; imageUrl: string }[];
};

export function EmoticonSheetPanel({
  characters,
}: {
  characters: EmoticonCharacterOption[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<EmoticonSource | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [useAge, setUseAge] = useState(false);
  const [age, setAge] = useState("3");
  const [ageUnit, setAgeUnit] = useState<EmoticonAgeUnit>("months");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      chooseFile(null);
    }
  }

  function resetSource() {
    setSource(null);
    setCharacterId(null);
    chooseFile(null);
    setError(null);
    router.replace("/dashboard/emoticon");
  }

  function chooseFile(next: File | null) {
    setError(null);
    setFile(next);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return next ? URL.createObjectURL(next) : null;
    });
  }

  async function generate() {
    if (generating) {
      return;
    }
    if (source === "photo" && !file) {
      setError("실제 사진을 올려 주세요.");
      return;
    }
    if (source === "character" && !characterId) {
      setError("만든 캐릭터를 골라 주세요.");
      return;
    }
    if (!source) {
      setError("실제 사진 또는 만든 캐릭터를 먼저 골라 주세요.");
      return;
    }
    if (useAge && !/^\d+$/.test(age.trim())) {
      setError("나이는 숫자로 입력해 주세요.");
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const body = new FormData();
      if (source === "character" && characterId) {
        body.set("characterId", characterId);
      } else if (file) {
        body.set("referenceImage", file);
      }
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
      if (!response.ok || !payload?.orderId || !payload.cells?.length) {
        setError(payload?.error ?? "이모티콘을 만들지 못했습니다.");
        setGenerating(false);
        return;
      }
      router.push(`/dashboard/emoticon/${payload.orderId}`);
    } catch {
      setError("이모티콘을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setGenerating(false);
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
          <p className="text-sm font-medium text-stone-800">사진 올리기</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={generating}
            className="mt-3 flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-3 py-6 text-sm text-stone-500 hover:border-sky-300 hover:bg-sky-50 disabled:opacity-60"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="올린 사진"
                className="max-h-56 w-full rounded-xl object-contain"
              />
            ) : (
              <span>JPG, PNG, WEBP 사진을 선택해 주세요</span>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
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
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                  "overflow-hidden rounded-2xl border bg-white text-left shadow-sm disabled:opacity-60",
                  selected ? "border-sky-400 ring-2 ring-sky-300" : "border-stone-200",
                )}
              >
                <span className="relative block aspect-square bg-stone-100">
                  <AppImage
                    src={character.imageSrc}
                    alt={character.label}
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                </span>
                <span className="block truncate px-3 py-2 text-sm font-semibold text-stone-800">
                  {character.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
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
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={age}
              disabled={generating}
              onChange={(event) => setAge(event.target.value)}
              aria-label="나이"
              className="h-11 w-24 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-sky-400"
            />
            <select
              value={ageUnit}
              disabled={generating}
              onChange={(event) => setAgeUnit(event.target.value as EmoticonAgeUnit)}
              aria-label="나이 단위"
              className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
            >
              <option value="months">개월</option>
              <option value="years">세</option>
            </select>
          </div>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            입력하지 않으면 원본에서 보이는 연령과 외형을 유지합니다.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void generate()}
        disabled={generating || !ready}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-sky-400 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
      >
        이모티콘 만들기
      </button>
      </>
      ) : null}
      {error ? <p className="mt-2 text-center text-sm text-red-500">{error}</p> : null}
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

export function EmoticonResultPanel({ initialPreview }: { initialPreview: EmoticonPreview }) {
  const [preview, setPreview] = useState(initialPreview);
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
      const payload = (await response.json().catch(() => null)) as { error?: string; paid?: boolean } | null;
      if (!response.ok || !payload?.paid) {
        setError(payload?.error ?? "결제하지 못했습니다.");
        return;
      }
      setPreview({ ...preview, paid: true });
      setPayOpen(false);
    } catch {
      setError("결제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
      {payOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
            <p className="text-base font-semibold text-stone-800">이모티콘 9장</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              결제하면 한 장씩 크게 보고, 보고 있는 장을 각각 받을 수 있어요.
            </p>
            <p className="mt-3 text-lg font-semibold text-stone-800">
              {formatKrw(EMOTICON_PACK_PRICE_KRW)}
            </p>
            <button
              type="button"
              onClick={() => void pay()}
              disabled={paying}
              className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-[#E07A5F] text-sm font-semibold text-white disabled:opacity-50"
            >
              {paying ? "결제 중..." : "결제하기"}
            </button>
            <button
              type="button"
              onClick={() => setPayOpen(false)}
              disabled={paying}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-full text-sm font-medium text-stone-500"
            >
              취소
            </button>
          </div>
        </div>
      ) : null}
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
          9장을 3×3으로 확인할 수 있어요. 결제하면 한 장씩 크게 보고 각각 받을 수 있습니다.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white">
          {preview.cells.map((cell) => (
            <img
              key={cell.key}
              src={toProtectedMediaSrc(cell.imageUrl)}
              alt={cell.caption}
              className="aspect-square w-full bg-white object-contain"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onPay}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-full bg-[#E07A5F] text-sm font-semibold text-white hover:bg-[#d56c51]"
        >
          {formatKrw(EMOTICON_PACK_PRICE_KRW)} 결제하고 한 장씩 받기
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-stone-800">받은 이모티콘</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        화살표로 한 장씩 넘겨 크게 보고, 보고 있는 장을 받을 수 있어요.
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
    </div>
  );
}
