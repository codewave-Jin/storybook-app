"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createStickerOrder, type CreateStickerOrderState } from "@/app/actions/stickers";
import { AppImage } from "@/components/AppImage";
import { GenerationProgress } from "@/components/GenerationProgress";
import { GENDER_LABEL } from "@/lib/orders";
import { cn } from "@/lib/utils";

export type StickerCharacterOption = {
  id: string;
  label: string;
  gender: "MALE" | "FEMALE";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  generatedImagePath: string | null;
  originalPhotoPath: string;
};

export type StickerTemplateOption = {
  id: string;
  label: string;
  thumbnailPath: string | null;
  available: boolean;
};

export type StickerCostumeOption = {
  id: string;
  label: string;
  referenceImageUrl: string | null;
  templateId: string;
  sortOrder: number;
};

export type StickerPhraseOption = {
  id: string;
  text: string;
};

export type StickerSizeOption = {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  quantityPerA4: number;
  available: boolean;
};

const STEP_COUNT = 6;
const STEP_LABELS = ["캐릭터", "용도", "옷", "문구", "사이즈", "제작 요청"] as const;
const CUSTOM_PHRASE = "__custom__";
const CUSTOM_COSTUME = "__custom__";
const MAX_PHRASE_LENGTH = 25;
const MAX_COSTUME_LENGTH = 20;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-[#E07A5F] text-base font-medium text-white hover:bg-[#d56c51] disabled:opacity-60 sm:w-auto sm:px-8"
    >
      {pending ? "제작 요청 중..." : "제작하기"}
    </button>
  );
}

export function StickerWizard({
  characters,
  templates,
  costumes,
  phrases,
  sizes,
}: {
  characters: StickerCharacterOption[];
  templates: StickerTemplateOption[];
  costumes: StickerCostumeOption[];
  phrases: StickerPhraseOption[];
  sizes: StickerSizeOption[];
}) {
  const [step, setStep] = useState(1);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [costumeKey, setCostumeKey] = useState<string | null>(null);
  const [customCostume, setCustomCostume] = useState("");
  const [phraseKey, setPhraseKey] = useState<string | null>(null);
  const [customPhrase, setCustomPhrase] = useState("");
  const [sizeOptionId, setSizeOptionId] = useState<string | null>(null);
  const [state, formAction] = useFormState<CreateStickerOrderState, FormData>(
    createStickerOrder,
    undefined,
  );

  const selectedCharacter = characters.find((item) => item.id === characterId);
  const selectedTemplate = templates.find((item) => item.id === templateId);
  const templateCostumes = useMemo(
    () =>
      costumes
        .filter((item) => item.templateId === templateId)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [costumes, templateId],
  );
  const selectedCostume = templateCostumes.find((item) => item.id === costumeKey);
  const costumeLabel =
    costumeKey === CUSTOM_COSTUME
      ? customCostume.trim()
      : selectedCostume?.label ?? "";
  const selectedSize = sizes.find((item) => item.id === sizeOptionId);
  const phrase =
    phraseKey === CUSTOM_PHRASE
      ? customPhrase.trim()
      : phrases.find((item) => item.id === phraseKey)?.text ?? "";

  const canNext = useMemo(() => {
    if (step === 1) return Boolean(characterId);
    if (step === 2) return Boolean(templateId);
    if (step === 3) {
      if (costumeKey === CUSTOM_COSTUME) {
        return (
          customCostume.trim().length > 0 &&
          customCostume.trim().length <= MAX_COSTUME_LENGTH
        );
      }
      return Boolean(costumeKey);
    }
    if (step === 4) return phrase.length > 0 && phrase.length <= MAX_PHRASE_LENGTH;
    if (step === 5) {
      return Boolean(
        sizeOptionId && sizes.find((item) => item.id === sizeOptionId)?.available,
      );
    }
    return true;
  }, [step, characterId, templateId, costumeKey, customCostume, phrase, sizeOptionId, sizes]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-stone-500">
          {step}/{STEP_COUNT} · {STEP_LABELS[step - 1]}
        </p>
        <div className="mt-3 grid grid-cols-6 gap-1.5 sm:gap-2">
          {STEP_LABELS.map((label, index) => {
            const number = index + 1;
            const active = number === step;
            const done = number < step;

            return (
              <div key={label} className="min-w-0">
                <div
                  className={cn(
                    "h-1.5 rounded-full",
                    active || done ? "bg-sky-400" : "bg-stone-200",
                  )}
                />
                <p
                  className={cn(
                    "mt-2 truncate text-[11px] sm:text-sm",
                    active ? "font-medium text-stone-900" : "text-stone-400",
                  )}
                >
                  {number}. {label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {step === 1 ? (
        <section>
          <h2 className="text-lg font-semibold">캐릭터를 한 명 선택해 주세요</h2>
          <p className="mt-1 text-sm text-stone-500">
            생성이 완료된 캐릭터만 스티커로 만들 수 있어요.
          </p>
          {characters.length === 0 ? (
            <EmptyCharacters />
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {characters.map((character) => {
                const selectable = character.status === "COMPLETED";
                const selected = character.id === characterId;
                const imageSrc =
                  character.status === "COMPLETED" && character.generatedImagePath
                    ? character.generatedImagePath
                    : character.originalPhotoPath;

                return (
                  <button
                    key={character.id}
                    type="button"
                    disabled={!selectable}
                    onClick={() => selectable && setCharacterId(character.id)}
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-white text-left shadow-sm",
                      selectable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                      selected
                        ? "border-sky-400 ring-2 ring-sky-300"
                        : "border-stone-200",
                    )}
                  >
                    <div className="no-image-save relative aspect-square bg-stone-100">
                      <AppImage
                        src={imageSrc}
                        alt={character.label}
                        fill
                        draggable={false}
                        className={cn(
                          "pointer-events-none object-cover",
                          !selectable && "grayscale",
                        )}
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                      {!selectable ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45">
                          {character.status === "FAILED" ? (
                            <span className="rounded-full bg-white px-3 py-1 text-sm font-medium">
                              생성 실패
                            </span>
                          ) : (
                            <div className="rounded-2xl bg-white/95 px-3 py-2">
                              <GenerationProgress
                                kind="character"
                                id={character.id}
                              />
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="truncate font-semibold">{character.label}</p>
                      <p className="text-xs text-stone-500 sm:text-sm">
                        {GENDER_LABEL[character.gender]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {step === 2 ? (
        <section>
          <h2 className="text-lg font-semibold">용도를 골라 주세요</h2>
          <p className="mt-1 text-sm text-stone-500">
            스티커를 어디에 쓸지 선택해요.
          </p>
          {templates.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-12 text-center text-sm text-stone-500">
              선택 가능한 용도가 없습니다.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {templates.map((template) => {
                const selected = template.id === templateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    disabled={!template.available}
                    onClick={() => {
                      if (!template.available) {
                        return;
                      }
                      setTemplateId(template.id);
                      setCostumeKey(null);
                      setCustomCostume("");
                    }}
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-white text-left shadow-sm",
                      selected
                        ? "border-sky-400 ring-2 ring-sky-300"
                        : "border-stone-200",
                      template.available
                        ? "hover:border-stone-300"
                        : "cursor-not-allowed opacity-55",
                    )}
                  >
                    <div className="relative aspect-square bg-[#F6E7C1]/40">
                      {template.thumbnailPath ? (
                        <AppImage
                          src={template.thumbnailPath}
                          alt={template.label}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl font-semibold text-[#8A5A12]">
                          {template.label.slice(0, 1)}
                        </div>
                      )}
                      {template.available ? null : (
                        <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                          준비 중
                        </span>
                      )}
                    </div>
                    <p className="p-3 font-semibold">{template.label}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section>
          <h2 className="text-lg font-semibold">옷을 골라 주세요</h2>
          <p className="mt-1 text-sm text-stone-500">
            스티커에 입힐 모습을 고르거나, 원하는 코스튬을 짧게 적어 주세요.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {templateCostumes.map((costume) => {
                const selected = costumeKey === costume.id;
                return (
                  <button
                    key={costume.id}
                    type="button"
                    onClick={() => {
                      setCostumeKey(costume.id);
                      setCustomCostume("");
                    }}
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-white text-left shadow-sm hover:border-stone-300",
                      selected
                        ? "border-sky-400 ring-2 ring-sky-300"
                        : "border-stone-200",
                    )}
                  >
                    {costume.referenceImageUrl ? (
                      <div className="relative aspect-square bg-[#F6E7C1]/40">
                        <AppImage
                          src={costume.referenceImageUrl}
                          alt={costume.label}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      </div>
                    ) : null}
                    <p className="p-5 font-semibold">{costume.label}</p>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCostumeKey(CUSTOM_COSTUME)}
                className={cn(
                  "rounded-2xl border bg-white p-5 text-left shadow-sm hover:border-stone-300",
                  costumeKey === CUSTOM_COSTUME
                    ? "border-[#E07A5F] ring-2 ring-[#E07A5F]/30"
                    : "border-stone-200",
                )}
              >
                <p className="font-semibold">직접 입력</p>
                <p className="mt-1 text-sm text-stone-500">원하는 코스튬을 짧게 적어요</p>
              </button>
            </div>
          {costumeKey === CUSTOM_COSTUME ? (
            <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-stone-700">
              코스튬
              <input
                type="text"
                value={customCostume}
                maxLength={MAX_COSTUME_LENGTH}
                placeholder="간략한 코스튬을 적어주세요 예: 파란 공룡 코스튬"
                onChange={(event) => setCustomCostume(event.target.value)}
                className="h-12 rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
              <span className="text-xs font-normal text-stone-400">
                {customCostume.length}/{MAX_COSTUME_LENGTH}
              </span>
            </label>
          ) : null}
        </section>
      ) : null}

      {step === 4 ? (
        <section>
          <h2 className="text-lg font-semibold">문구를 넣어 주세요</h2>
          <p className="mt-1 text-sm text-stone-500">
            자주 쓰는 말을 고르거나, 직접 적을 수 있어요.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {phrases.map((item) => {
              const selected = phraseKey === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPhraseKey(item.id)}
                  className={cn(
                    "h-11 rounded-full px-4 text-sm font-medium",
                    selected
                      ? "bg-sky-400 text-white"
                      : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-sky-50",
                  )}
                >
                  {item.text}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPhraseKey(CUSTOM_PHRASE)}
              className={cn(
                "h-11 rounded-full px-4 text-sm font-medium",
                phraseKey === CUSTOM_PHRASE
                  ? "bg-[#E07A5F] text-white"
                  : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-[#FDE8E0]",
              )}
            >
              직접 입력
            </button>
          </div>
          {phraseKey === CUSTOM_PHRASE ? (
            <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-stone-700">
              문구
              <input
                type="text"
                value={customPhrase}
                maxLength={MAX_PHRASE_LENGTH}
                placeholder="스티커에 넣을 말을 적어 주세요"
                onChange={(event) => setCustomPhrase(event.target.value)}
                className="h-12 rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
              <span className="text-xs font-normal text-stone-400">
                {customPhrase.length}/{MAX_PHRASE_LENGTH}
              </span>
            </label>
          ) : null}
          {phrase ? (
            <p className="mt-4 rounded-xl bg-[#F6E7C1]/70 px-4 py-3 text-sm text-[#8A5A12]">
              들어갈 문구: <span className="font-semibold">{phrase}</span>
            </p>
          ) : null}
        </section>
      ) : null}

      {step === 5 ? (
        <section>
          <h2 className="text-lg font-semibold">사이즈를 선택해 주세요</h2>
          <p className="mt-1 text-sm text-stone-500">
            고른 크기에 맞춰 A4 한 장에 들어가는 개수가 정해져요.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {sizes.map((option) => {
              const selected = option.id === sizeOptionId;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={!option.available}
                  onClick={() => {
                    if (!option.available) {
                      return;
                    }
                    setSizeOptionId(option.id);
                  }}
                  className={cn(
                    "relative rounded-2xl border bg-white p-5 text-left shadow-sm",
                    selected
                      ? "border-sky-400 ring-2 ring-sky-300"
                      : "border-stone-200",
                    option.available
                      ? "hover:border-stone-300"
                      : "cursor-not-allowed opacity-55",
                  )}
                >
                  {option.available ? null : (
                    <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-stone-500 ring-1 ring-stone-200">
                      준비 중
                    </span>
                  )}
                  <p className="font-semibold">{option.label}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {option.widthMm} × {option.heightMm}mm
                  </p>
                  <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
                    A4 한 장에 {option.quantityPerA4}개
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === 6 ? (
        <section>
          <h2 className="text-lg font-semibold">이대로 제작할까요?</h2>
          <div className="mt-4 space-y-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-8">
            <SummaryRow label="캐릭터" value={selectedCharacter?.label} />
            <SummaryRow label="용도" value={selectedTemplate?.label} />
            <SummaryRow label="옷" value={costumeLabel} />
            <SummaryRow label="문구" value={phrase} />
            <SummaryRow
              label="사이즈"
              value={
                selectedSize
                  ? `${selectedSize.label} · A4 한 장에 ${selectedSize.quantityPerA4}개`
                  : undefined
              }
            />
          </div>

          <form action={formAction} className="mt-6">
            <input type="hidden" name="characterId" value={characterId ?? ""} />
            <input type="hidden" name="templateId" value={templateId ?? ""} />
            <input type="hidden" name="costumeId" value={costumeKey === CUSTOM_COSTUME ? "" : (costumeKey ?? "")} />
            <input type="hidden" name="customCostumeHint" value={costumeKey === CUSTOM_COSTUME ? customCostume.trim() : ""} />
            <input type="hidden" name="phrase" value={phrase} />
            <input type="hidden" name="sizeOptionId" value={sizeOptionId ?? ""} />
            {state?.error ? (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            ) : null}
            <SubmitButton />
          </form>
        </section>
      ) : null}

      {step !== 6 ? (
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(current - 1, 1))}
              className="flex h-12 items-center justify-center rounded-xl border border-stone-300 px-6 text-sm font-medium hover:bg-white"
            >
              이전
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="flex h-12 items-center justify-center rounded-xl border border-stone-300 px-6 text-sm font-medium hover:bg-white"
            >
              대시보드로
            </Link>
          )}
          <button
            type="button"
            onClick={() => setStep((current) => Math.min(current + 1, STEP_COUNT))}
            disabled={!canNext}
            className="flex h-12 items-center justify-center rounded-xl bg-sky-400 px-8 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            다음
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setStep(5)}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl border border-stone-300 px-6 text-sm font-medium hover:bg-white sm:w-auto"
        >
          이전
        </button>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 font-medium">{value || "—"}</p>
    </div>
  );
}

function EmptyCharacters() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <p className="font-medium">먼저 캐릭터를 만들어주세요</p>
      <p className="mt-1 text-sm text-stone-500">
        스티커에 들어갈 주인공이 필요해요.
      </p>
      <Link
        href="/dashboard/characters/new"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-sky-400 px-5 text-sm font-medium text-white"
      >
        캐릭터 만들러 가기
      </Link>
    </div>
  );
}
