"use client";

import { cn } from "@/lib/utils";
import {
  CLOTHING_TOPICS,
  SPECIAL_GENDER_OPTIONS,
  SPECIAL_STICKER_KINDS,
  type ClothingTopicKey,
  type SpecialGender,
  type SpecialStickerKind,
} from "@/lib/sticker-special";

export function SpecialStickerPanel({
  kind,
  clothingTopic,
  name,
  gender,
  phrase,
  tokenBalance,
  generating,
  error,
  onKindChange,
  onClothingTopicChange,
  onNameChange,
  onGenderChange,
  onPhraseChange,
  onGenerate,
}: {
  kind: SpecialStickerKind | null;
  clothingTopic: ClothingTopicKey | null;
  name: string;
  gender: SpecialGender | "";
  phrase: string;
  tokenBalance: number;
  generating: boolean;
  error: string | null;
  onKindChange: (kind: SpecialStickerKind) => void;
  onClothingTopicChange: (topic: ClothingTopicKey) => void;
  onNameChange: (value: string) => void;
  onGenderChange: (value: SpecialGender) => void;
  onPhraseChange: (value: string) => void;
  onGenerate: () => void;
}) {
  if (!kind) {
    return (
      <section>
        <h2 className="text-lg font-semibold">특수 제작을 골라 주세요</h2>
        <p className="mt-1 text-sm text-stone-500">
          이름표나 의류 스티커를 선택하면 입력란이 나와요.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SPECIAL_STICKER_KINDS.map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (item.key === "nametag" || item.key === "clothing") {
                  onKindChange(item.key);
                }
              }}
              className={cn(
                "relative rounded-2xl border bg-white p-5 text-left shadow-sm",
                item.disabled
                  ? "cursor-not-allowed border-stone-200 opacity-55"
                  : "border-stone-200 hover:border-stone-300",
              )}
            >
              {item.disabled ? (
                <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-stone-500 ring-1 ring-stone-200">
                  준비 중
                </span>
              ) : null}
              <p className="font-semibold">{item.label}</p>
              <p className="mt-1 text-sm text-stone-500">{item.description}</p>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (kind === "clothing" && !clothingTopic) {
    return (
      <section>
        <h2 className="text-lg font-semibold">주제를 골라 주세요</h2>
        <p className="mt-1 text-sm text-stone-500">
          고른 주제에 맞는 문구가 먼저 들어가요. 다음에서 고칠 수 있어요.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CLOTHING_TOPICS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onClothingTopicChange(item.key)}
              className="rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm hover:border-stone-300"
            >
              <p className="font-semibold">{item.label}</p>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const canGenerate =
    kind === "nametag"
      ? Boolean(name.trim() && gender)
      : Boolean(clothingTopic && phrase.trim());
  const noTokens = tokenBalance < 1;

  return (
    <section>
      <h2 className="text-lg font-semibold">
        {kind === "nametag" ? "이름표" : clothingTopic}
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        {kind === "nametag"
          ? "이름과 성별을 고른 뒤 생성해 주세요."
          : "문구를 확인하고 필요하면 고친 뒤 생성해 주세요."}
      </p>

      {kind === "nametag" ? (
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700">
              이름
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="예: 안소민"
              className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-stone-700">성별</legend>
            <div className="grid grid-cols-2 gap-2">
              {SPECIAL_GENDER_OPTIONS.map((option) => (
                <label
                  key={option.key}
                  className="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium has-[:checked]:border-sky-400 has-[:checked]:bg-sky-400 has-[:checked]:text-white"
                >
                  <input
                    type="radio"
                    name="special-gender"
                    value={option.key}
                    checked={gender === option.key}
                    onChange={() => onGenderChange(option.key)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : (
        <div className="mt-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700">
              문구
            </span>
            <textarea
              value={phrase}
              onChange={(event) => onPhraseChange(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
            />
          </label>
        </div>
      )}

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canGenerate || generating || noTokens}
        onClick={onGenerate}
        className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 px-8 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {generating ? "생성 중..." : "생성"}
      </button>
      <p className="mt-2 text-sm text-stone-500">
        {noTokens
          ? "토큰이 부족합니다"
          : `현재 토큰 ${tokenBalance}개 · 생성 시 1개가 사용되고, 결제하면 돌려드려요.`}
      </p>
    </section>
  );
}
