"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function SubmitButton({
  disabledReason,
  pending,
}: {
  disabledReason?: string;
  pending: boolean;
}) {
  const disabled = pending || Boolean(disabledReason);

  return (
    <div className="space-y-2">
      <button
        type="submit"
        disabled={disabled}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-stone-900 text-base font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "생성 중..." : "캐릭터 생성하기"}
      </button>
      {disabledReason ? (
        <p className="text-center text-sm text-red-600">{disabledReason}</p>
      ) : null}
    </div>
  );
}

export function CharacterCreateForm({ tokenBalance }: { tokenBalance: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onFiles(files: FileList | null) {
    const next = files?.[0];
    if (!next || !next.type.startsWith("image/")) {
      return;
    }

    setFile(next);

    if (inputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(next);
      inputRef.current.files = dataTransfer.files;
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/characters", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const payload = (await response.json().catch(() => null)) as {
        character_id?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.character_id) {
        setError(payload?.error ?? "캐릭터 생성에 실패했습니다.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("캐릭터 생성에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  const noTokens = tokenBalance < 1;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
        라벨
        <input
          name="label"
          type="text"
          required
          placeholder='예: "엄마", "아빠", "딸"'
          className="h-12 rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-stone-700">성별</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium has-[:checked]:border-stone-900 has-[:checked]:bg-stone-900 has-[:checked]:text-white">
            <input
              type="radio"
              name="gender"
              value="FEMALE"
              required
              className="sr-only"
            />
            여자
          </label>
          <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium has-[:checked]:border-stone-900 has-[:checked]:bg-stone-900 has-[:checked]:text-white">
            <input
              type="radio"
              name="gender"
              value="MALE"
              className="sr-only"
            />
            남자
          </label>
        </div>
      </fieldset>

      <div className="space-y-2">
        <p className="text-sm font-medium text-stone-700">사진</p>
        <label
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
            onFiles(event.dataTransfer.files);
          }}
          className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
            dragActive
              ? "border-stone-900 bg-stone-100"
              : "border-stone-300 bg-white"
          }`}
        >
          <input
            ref={inputRef}
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
            className="sr-only"
            onChange={(event) => onFiles(event.target.files)}
          />
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="업로드 미리보기"
              className="max-h-56 w-full rounded-xl object-contain"
            />
          ) : (
            <div className="space-y-1 text-sm text-stone-500">
              <p className="font-medium text-stone-700">
                사진을 드래그하거나 눌러서 업로드
              </p>
              <p>JPG, PNG, WEBP · 최대 5MB</p>
            </div>
          )}
        </label>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <SubmitButton
        pending={pending}
        disabledReason={
          noTokens ? "토큰이 부족합니다 (충전하기)" : undefined
        }
      />
    </form>
  );
}
