"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CharacterPhotoPicker } from "@/components/CharacterPhotoPicker";

function SubmitButton({
  disabledReason,
  pending,
  photoReady,
}: {
  disabledReason?: string;
  pending: boolean;
  photoReady: boolean;
}) {
  const disabled = pending || !photoReady || Boolean(disabledReason);

  return (
    <div className="space-y-2">
      <button
        type="submit"
        disabled={disabled}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 text-base font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "생성 중..." : "캐릭터 생성하기"}
      </button>
      {disabledReason ? (
        <p className="text-center text-sm text-red-600">{disabledReason}</p>
      ) : !photoReady && !pending ? (
        <p className="text-center text-sm text-stone-500">
          촬영하거나 사진을 선택한 뒤에 생성할 수 있습니다.
        </p>
      ) : null}
    </div>
  );
}

export function CharacterCreateForm({
  tokenBalance,
  isLoggedIn = true,
}: {
  tokenBalance: number;
  isLoggedIn?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const submittingRef = useRef(false);
  const photoFileRef = useRef<File | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoggedIn) {
      router.push("/login?callbackUrl=/dashboard/characters/new");
      return;
    }
    if (submittingRef.current || pending || !photoFileRef.current) {
      return;
    }

    submittingRef.current = true;
    setError(null);
    setPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      if (photoFileRef.current) {
        formData.set("photo", photoFileRef.current);
      }
      const response = await fetch("/api/characters", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as {
        character_id?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.character_id) {
        submittingRef.current = false;
        setPending(false);
        setError(payload?.error ?? "캐릭터 생성에 실패했습니다.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      submittingRef.current = false;
      setPending(false);
      setError("캐릭터 생성에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  const noTokens = tokenBalance < 1;

  return (
    <form
      onSubmit={onSubmit}
      className={`flex flex-col gap-5 ${pending ? "pointer-events-none" : ""}`}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
        이름
        <input
          name="label"
          type="text"
          required
          placeholder='예: "엄마", "아빠", "딸"'
          className="h-12 rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-stone-700">성별</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium has-[:checked]:border-sky-400 has-[:checked]:bg-sky-400 has-[:checked]:text-white">
            <input
              type="radio"
              name="gender"
              value="FEMALE"
              required
              className="sr-only"
            />
            여자
          </label>
          <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium has-[:checked]:border-sky-400 has-[:checked]:bg-sky-400 has-[:checked]:text-white">
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

      <CharacterPhotoPicker
        disabled={pending}
        onPhotoChange={(file) => {
          photoFileRef.current = file;
          setHasPhoto(Boolean(file));
        }}
      />

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {isLoggedIn ? (
        <SubmitButton
          pending={pending}
          photoReady={hasPhoto}
          disabledReason={
            noTokens ? "토큰이 부족합니다 (충전하기)" : undefined
          }
        />
      ) : (
        <Link
          href="/login?callbackUrl=/dashboard/characters/new"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 text-base font-medium text-white hover:bg-sky-500"
        >
          로그인하고 생성하기
        </Link>
      )}
    </form>
  );
}
