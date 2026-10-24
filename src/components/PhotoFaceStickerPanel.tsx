"use client";

import { useEffect, useState } from "react";
import { CharacterPhotoPicker } from "@/components/CharacterPhotoPicker";
import { cutoutHeadPng } from "@/lib/head-cutout";

function originalCharacterPhotoSrc(src: string) {
  if (!src.includes("/api/media/character/")) {
    return src;
  }
  const url = new URL(src, "http://local");
  url.searchParams.set("v", "original");
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function PhotoFaceStickerPanel({
  characterPhotoSrc,
  onUseCutout,
}: {
  characterPhotoSrc: string;
  onUseCutout: (imagePath: string) => void;
}) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  async function cutoutFromBlob(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const png = await cutoutHeadPng(blob);
      setPreviewBlob(png);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(png);
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

  async function loadCharacterPhoto() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(originalCharacterPhotoSrc(characterPhotoSrc));
      if (!response.ok) {
        throw new Error("캐릭터 사진을 불러오지 못했습니다.");
      }
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("캐릭터 사진을 불러오지 못했습니다.");
      }
      await cutoutFromBlob(blob);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "캐릭터 사진을 불러오지 못했습니다.",
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
    setError(null);
  }

  if (previewUrl) {
    return (
      <section>
        <h2 className="text-lg font-semibold">머리만 남겼어요</h2>
        <p className="mt-1 text-sm text-stone-500">
          이 얼굴로 스티커 레이어를 만들면 문구와 장식을 올릴 수 있어요.
        </p>
        <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-stone-200 bg-[length:16px_16px] bg-[linear-gradient(45deg,#e7e5e4_25%,transparent_25%),linear-gradient(-45deg,#e7e5e4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e7e5e4_75%),linear-gradient(-45deg,transparent_75%,#e7e5e4_75%)] bg-[position:0_0,0_8px,8px_-8px,-8px_0] bg-white px-4 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="분리한 실사 얼굴"
            className="max-h-72 max-w-full object-contain"
          />
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
      <h2 className="text-lg font-semibold">실사 얼굴을 올려 주세요</h2>
      <p className="mt-1 text-sm text-stone-500">
        원 안에 얼굴이 한 명만 가득 차게 맞추면 배경과 목을 지우고 머리만 남겨요.
        그다음 문구와 장식을 올릴 수 있어요.
      </p>
      <button
        type="button"
        onClick={() => void loadCharacterPhoto()}
        disabled={busy}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "얼굴을 분리하는 중..." : "선택한 캐릭터 사진으로 머리만 남기기"}
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
