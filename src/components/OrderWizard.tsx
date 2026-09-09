"use client";

import Link from "next/link";
import { AppImage } from "@/components/AppImage";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { GenerationProgress } from "@/components/GenerationProgress";
import { createOrder, type CreateOrderState } from "@/app/actions/orders";
import { CUSTOM_INPUT_MAX_LENGTH } from "@/lib/custom-input-guard";
import type { CastRole, CustomField, HeroAgeRangeKey } from "@/lib/templates";
import {
  HERO_AGE_RANGES,
  MAX_SUPPORTING_CAST,
  castRoleLabel,
  customFieldDisplayValue,
  customFieldOptions,
  isChoiceCustomField,
  isEnabledHeroAgeRangeKey,
} from "@/lib/templates";
import { cn } from "@/lib/utils";

export type OrderArtStyleOption = {
  id: string;
  key: string;
  label: string;
  referenceImageUrl: string;
};

export type OrderTemplateOption = {
  id: string;
  title: string;
  description: string | null;
  available: boolean;
  customFields: CustomField[];
  castRoles: CastRole[];
  artStyles: OrderArtStyleOption[];
};

export type OrderCharacterOption = {
  id: string;
  label: string;
  gender: "MALE" | "FEMALE";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  generatedImagePath: string | null;
  originalPhotoPath: string;
};

const STEP_LABELS = [
  "동화책 유형",
  "그림체",
  "주인공",
  "추가 정보",
  "미리보기",
] as const;
const GENDER_LABEL = {
  MALE: "남자아이",
  FEMALE: "여자아이",
} as const;

const STEP_TEMPLATE = 1;
const STEP_ART_STYLE = 2;
const STEP_CHARACTERS = 3;
const STEP_FIELDS = 4;
const STEP_CONFIRM = 5;

function defaultArtStyleId(styles: OrderArtStyleOption[]) {
  return (
    styles.find((style) => style.key === "watercolor")?.id ??
    styles[0]?.id ??
    null
  );
}

function PreviewButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 text-base font-medium text-white hover:bg-sky-500 disabled:opacity-60 sm:w-auto sm:px-8"
    >
      {pending ? "미리보기 만드는 중..." : "미리보기 만들기"}
    </button>
  );
}

export function OrderWizard({
  templates,
  characters,
}: {
  templates: OrderTemplateOption[];
  characters: OrderCharacterOption[];
}) {
  const [step, setStep] = useState(STEP_TEMPLATE);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [artStyleId, setArtStyleId] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [heroAgeRange, setHeroAgeRange] = useState<HeroAgeRangeKey | null>(
    null,
  );
  const [supportingCast, setSupportingCast] = useState<
    Array<{ characterId: string; relationKey: string }>
  >([]);
  const [addingCast, setAddingCast] = useState(false);
  const [draftRelationKey, setDraftRelationKey] = useState<string | null>(null);
  const [draftCharacterId, setDraftCharacterId] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [state, formAction] = useFormState<CreateOrderState, FormData>(
    createOrder,
    undefined,
  );

  const selectedTemplate = templates.find((template) => template.id === templateId);
  const customFields = selectedTemplate?.customFields ?? [];
  const castRoles = selectedTemplate?.castRoles ?? [];
  const artStyles = selectedTemplate?.artStyles ?? [];
  const selectedArtStyle = artStyles.find((style) => style.id === artStyleId);
  const selectedCharacter = characters.find(
    (character) => character.id === characterId,
  );
  const usedCharacterIds = new Set([
    ...(characterId ? [characterId] : []),
    ...supportingCast.map((member) => member.characterId),
  ]);
  const extraCastCandidates = characters.filter(
    (character) =>
      character.status === "COMPLETED" && !usedCharacterIds.has(character.id),
  );

  const canSkipArtStyle = artStyles.length === 0;
  const canSkipFields = customFields.length === 0;

  function goNext() {
    if (step === STEP_TEMPLATE && canSkipArtStyle) {
      setStep(STEP_CHARACTERS);
      return;
    }
    if (step === STEP_CHARACTERS && canSkipFields) {
      setStep(STEP_CONFIRM);
      return;
    }
    setStep((current) => Math.min(current + 1, STEP_CONFIRM));
  }

  function goPrev() {
    if (step === STEP_CONFIRM && canSkipFields) {
      setStep(STEP_CHARACTERS);
      return;
    }
    if (step === STEP_CHARACTERS && canSkipArtStyle) {
      setStep(STEP_TEMPLATE);
      return;
    }
    setStep((current) => Math.max(current - 1, STEP_TEMPLATE));
  }

  const canNext = useMemo(() => {
    if (step === STEP_TEMPLATE) return Boolean(templateId);
    if (step === STEP_ART_STYLE) {
      return canSkipArtStyle || Boolean(artStyleId);
    }
    if (step === STEP_CHARACTERS) {
      return Boolean(characterId) && isEnabledHeroAgeRangeKey(heroAgeRange ?? "");
    }
    if (step === STEP_FIELDS) {
      return customFields.every((field) => {
        if (field.required === false) {
          return true;
        }
        return Boolean(customValues[field.key]?.trim());
      });
    }
    return true;
  }, [
    step,
    templateId,
    artStyleId,
    canSkipArtStyle,
    characterId,
    heroAgeRange,
    customFields,
    customValues,
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-stone-500">
          {step}/{STEP_LABELS.length} · {STEP_LABELS[step - 1]}
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {STEP_LABELS.map((label, index) => {
            const number = index + 1;
            const active = number === step;
            const skipped =
              (canSkipArtStyle && number === STEP_ART_STYLE) ||
              (canSkipFields && number === STEP_FIELDS);
            const done = number < step || (skipped && step > number);

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
                    "mt-2 truncate text-xs sm:text-sm",
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

      {step === STEP_TEMPLATE ? (
        <section>
          <h2 className="text-lg font-semibold">동화책 유형을 선택해 주세요</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                    setCustomValues({});
                    setArtStyleId(defaultArtStyleId(template.artStyles));
                    setSupportingCast([]);
                    setAddingCast(false);
                    setDraftRelationKey(null);
                    setDraftCharacterId(null);
                  }}
                  className={cn(
                    "rounded-2xl border bg-white p-5 text-left shadow-sm transition",
                    selected
                      ? "border-sky-400 ring-2 ring-sky-300"
                      : "border-stone-200",
                    template.available
                      ? "hover:border-stone-400"
                      : "cursor-not-allowed opacity-55",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold">{template.title}</h3>
                    {template.available ? null : (
                      <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                        준비 중
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-stone-500">
                    {template.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === STEP_ART_STYLE ? (
        <section>
          <h2 className="text-lg font-semibold">그림체를 선택해 주세요</h2>
          <p className="mt-1 text-sm text-stone-500">
            동화책 전체에 적용될 그림 스타일입니다. 하나만 고를 수 있어요.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-5">
            {artStyles.map((style) => {
              const selected = style.id === artStyleId;
              return (
                <label
                  key={style.id}
                  className={cn(
                    "relative cursor-pointer overflow-hidden rounded-xl border bg-white shadow-sm",
                    selected
                      ? "border-sky-400 ring-2 ring-sky-300"
                      : "border-stone-200 hover:border-stone-400",
                  )}
                >
                  <input
                    type="radio"
                    name="artStyle"
                    className="sr-only"
                    checked={selected}
                    onChange={() => setArtStyleId(style.id)}
                  />
                  <div className="relative aspect-square bg-stone-100">
                    <AppImage
                      src={style.referenceImageUrl}
                      alt={style.label}
                      fill
                      className="pointer-events-none object-cover"
                      sizes="(max-width: 640px) 33vw, 160px"
                    />
                  </div>
                  <div className="px-1 py-1.5">
                    <p className="truncate text-center text-xs font-medium sm:text-sm">
                      {style.label}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === STEP_CHARACTERS ? (
        <section>
          <h2 className="text-lg font-semibold">
            처음 주인공 캐릭터를 선택해 주세요
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            생성이 완료된 캐릭터만 선택할 수 있습니다. 주인공은 한 명만 고를 수
            있어요.
          </p>

          {characters.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
              <p className="font-medium">먼저 캐릭터를 만들어주세요</p>
              <p className="mt-1 text-sm text-stone-500">
                동화책에 등장할 주인공이 필요해요.
              </p>
              <Link
                href="/dashboard/characters/new"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-sky-400 px-5 text-sm font-medium text-white"
              >
                캐릭터 만들러 가기
              </Link>
            </div>
          ) : (
            <>
              <CharacterPickGrid
                characters={characters}
                selectedId={characterId}
                onSelect={(id) => {
                  setCharacterId(id);
                  setSupportingCast((current) =>
                    current.filter((member) => member.characterId !== id),
                  );
                  if (draftCharacterId === id) {
                    setDraftCharacterId(null);
                  }
                }}
              />

              <div className="mt-8">
                <h3 className="text-base font-semibold">
                  주인공의 나이를 선택해 주세요
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  나이에 따라 동화책 스토리가 달라져요.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {HERO_AGE_RANGES.map((range) => {
                    const selected = heroAgeRange === range.key;
                    const disabled = range.disabled;
                    return (
                      <button
                        key={range.key}
                        type="button"
                        disabled={disabled}
                        aria-disabled={disabled}
                        onClick={() => {
                          if (disabled) {
                            return;
                          }
                          setHeroAgeRange(range.key);
                        }}
                        className={cn(
                          "h-12 rounded-xl border text-sm font-medium",
                          disabled
                            ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
                            : selected
                              ? "border-sky-400 bg-sky-50 text-sky-700 ring-2 ring-sky-300"
                              : "border-stone-200 bg-white text-stone-700 hover:border-stone-400",
                        )}
                      >
                        {range.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {castRoles.length > 0 ? (
                <div className="mt-8">
                  <h3 className="text-base font-semibold">등장인물 추가</h3>
                  <p className="mt-1 text-sm text-stone-500">
                    한 명만 추가할 수 있어요. 없어도 다음으로 갈 수 있어요.
                  </p>

                  {supportingCast.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {supportingCast.map((member) => {
                        const character = characters.find(
                          (item) => item.id === member.characterId,
                        );
                        if (!character) {
                          return null;
                        }
                        const imageSrc =
                          character.generatedImagePath ??
                          character.originalPhotoPath;
                        return (
                          <li
                            key={`${member.characterId}-${member.relationKey}`}
                            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2"
                          >
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                              <AppImage
                                src={imageSrc}
                                alt={character.label}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {character.label}
                              </p>
                              <p className="text-xs text-stone-500">
                                {castRoleLabel(castRoles, member.relationKey)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setSupportingCast((current) =>
                                  current.filter(
                                    (item) =>
                                      item.characterId !== member.characterId,
                                  ),
                                )
                              }
                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                            >
                              삭제
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  {addingCast &&
                  supportingCast.length < MAX_SUPPORTING_CAST ? (
                    <div className="mt-4 space-y-4 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
                      <div>
                        <p className="text-sm font-medium text-stone-700">
                          관계
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {castRoles.map((role) => {
                            const selected = draftRelationKey === role.key;
                            return (
                              <button
                                key={role.key}
                                type="button"
                                onClick={() => setDraftRelationKey(role.key)}
                                className={cn(
                                  "h-10 rounded-full border px-4 text-sm font-medium",
                                  selected
                                    ? "border-sky-400 bg-sky-50 text-sky-700"
                                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-400",
                                )}
                              >
                                {role.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-700">
                          캐릭터
                        </p>
                        {extraCastCandidates.length === 0 ? (
                          <p className="mt-2 text-sm text-stone-500">
                            추가할 수 있는 다른 캐릭터가 없어요.
                          </p>
                        ) : (
                          <div className="mt-2">
                            <CharacterPickGrid
                              characters={extraCastCandidates}
                              selectedId={draftCharacterId}
                              onSelect={setDraftCharacterId}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAddingCast(false);
                            setDraftRelationKey(null);
                            setDraftCharacterId(null);
                          }}
                          className="flex h-11 flex-1 items-center justify-center rounded-xl border border-stone-300 text-sm font-medium hover:bg-stone-50"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          disabled={!draftRelationKey || !draftCharacterId}
                          onClick={() => {
                            if (!draftRelationKey || !draftCharacterId) {
                              return;
                            }
                            setSupportingCast((current) => {
                              if (current.length >= MAX_SUPPORTING_CAST) {
                                return current;
                              }
                              return [
                                ...current,
                                {
                                  characterId: draftCharacterId,
                                  relationKey: draftRelationKey,
                                },
                              ];
                            });
                            setAddingCast(false);
                            setDraftRelationKey(null);
                            setDraftCharacterId(null);
                          }}
                          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-sky-400 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          추가하기
                        </button>
                      </div>
                    </div>
                  ) : extraCastCandidates.length > 0 &&
                    supportingCast.length < MAX_SUPPORTING_CAST ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingCast(true);
                        setDraftRelationKey(
                          castRoles.length === 1 ? castRoles[0].key : null,
                        );
                        setDraftCharacterId(null);
                      }}
                      className="mt-4 flex h-11 w-full items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white text-sm font-medium text-stone-700 hover:border-sky-400 hover:bg-sky-50"
                    >
                      등장인물 추가
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {step === STEP_FIELDS ? (
        <section>
          <h2 className="text-lg font-semibold">추가 정보를 선택해 주세요</h2>
          <div className="mt-4 space-y-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-8">
            {customFields.map((field) => {
              const isRequired = field.required !== false;
              const current = customValues[field.key] ?? "";
              const options = customFieldOptions(field);
              if (isChoiceCustomField(field) && options.length > 0) {
                return (
                  <div key={field.key}>
                    <p className="text-sm font-medium text-stone-800">
                      {field.label}
                      {isRequired ? null : (
                        <span className="ml-1 font-normal text-stone-400">
                          (선택)
                        </span>
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {options.map((option) => {
                        const selected = current === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setCustomValues((currentValues) => ({
                                ...currentValues,
                                [field.key]:
                                  !isRequired &&
                                  currentValues[field.key] === option.value
                                    ? ""
                                    : option.value,
                              }))
                            }
                            className={cn(
                              "inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
                              selected
                                ? "border-sky-400 bg-sky-50 text-sky-700 ring-2 ring-sky-300"
                                : "border-stone-200 bg-white text-stone-700 hover:border-stone-400",
                            )}
                          >
                            {option.emoji ? (
                              <span className="text-base leading-none">
                                {option.emoji}
                              </span>
                            ) : null}
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <label
                  key={field.key}
                  className="flex flex-col gap-1.5 text-sm font-medium text-stone-700"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      {field.label}
                      {isRequired ? null : (
                        <span className="ml-1 font-normal text-stone-400">
                          (선택)
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-normal tabular-nums text-stone-400">
                      {current.length}/{CUSTOM_INPUT_MAX_LENGTH}
                    </span>
                  </span>
                  <input
                    type="text"
                    value={current}
                    required={isRequired}
                    maxLength={CUSTOM_INPUT_MAX_LENGTH}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      setCustomValues((currentValues) => ({
                        ...currentValues,
                        [field.key]: event.target.value.slice(
                          0,
                          CUSTOM_INPUT_MAX_LENGTH,
                        ),
                      }))
                    }
                    className="h-12 rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  />
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === STEP_CONFIRM ? (
        <section>
          <h2 className="text-lg font-semibold">주문 내용을 확인해 주세요</h2>
          <div className="mt-4 space-y-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-8">
            <div>
              <p className="text-sm text-stone-500">동화책</p>
              <p className="mt-1 font-medium">{selectedTemplate?.title}</p>
            </div>
            {selectedArtStyle ? (
              <div>
                <p className="text-sm text-stone-500">그림체</p>
                <p className="mt-1 font-medium">{selectedArtStyle.label}</p>
              </div>
            ) : null}
            <div>
              <p className="text-sm text-stone-500">주인공</p>
              <p className="mt-1 font-medium">
                {selectedCharacter
                  ? `${selectedCharacter.label} (${GENDER_LABEL[selectedCharacter.gender]})`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-stone-500">나이</p>
              <p className="mt-1 font-medium">
                {HERO_AGE_RANGES.find((range) => range.key === heroAgeRange)
                  ?.label ?? "-"}
              </p>
            </div>
            {supportingCast.length > 0 ? (
              <div>
                <p className="text-sm text-stone-500">등장인물</p>
                <ul className="mt-1 space-y-1">
                  {supportingCast.map((member) => {
                    const character = characters.find(
                      (item) => item.id === member.characterId,
                    );
                    return (
                      <li key={`${member.characterId}-${member.relationKey}`}>
                        <span className="font-medium">
                          {character?.label ?? "캐릭터"}
                        </span>
                        <span className="text-stone-500">
                          {" "}
                          · {castRoleLabel(castRoles, member.relationKey)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            {customFields.length > 0 ? (
              <div>
                <p className="text-sm text-stone-500">추가 입력</p>
                <ul className="mt-1 space-y-1">
                  {customFields.map((field) => (
                    <li key={field.key}>
                      <span className="text-stone-500">{field.label}: </span>
                      <span className="font-medium">
                        {customFieldDisplayValue(
                          field,
                          customValues[field.key] ?? "",
                        ) || "-"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="rounded-lg bg-[#F6E7C1]/70 px-3 py-2 text-sm text-[#8A5A12]">
              지금은 표지와 1페이지, 3페이지를 먼저 만들어요. 마음에 들면 결제로 나머지 장을 이어서 완성할 수 있어요.
            </p>
          </div>

          <form action={formAction} className="mt-6">
            <input type="hidden" name="templateId" value={templateId ?? ""} />
            <input type="hidden" name="artStyleId" value={artStyleId ?? ""} />
            <input
              type="hidden"
              name="heroCharacterId"
              value={characterId ?? ""}
            />
            <input
              type="hidden"
              name="heroAgeRange"
              value={heroAgeRange ?? ""}
            />
            {supportingCast.map((member) => (
              <span key={`${member.characterId}-${member.relationKey}`}>
                <input
                  type="hidden"
                  name="castCharacterIds"
                  value={member.characterId}
                />
                <input
                  type="hidden"
                  name="castRelationKeys"
                  value={member.relationKey}
                />
              </span>
            ))}
            {customFields.map((field) => (
              <input
                key={field.key}
                type="hidden"
                name={`custom:${field.key}`}
                value={(customValues[field.key] ?? "").slice(
                  0,
                  CUSTOM_INPUT_MAX_LENGTH,
                )}
              />
            ))}
            {state?.error ? (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            ) : null}
            <PreviewButton />
          </form>
        </section>
      ) : null}

      {step !== STEP_CONFIRM ? (
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {step > STEP_TEMPLATE ? (
            <button
              type="button"
              onClick={goPrev}
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
            onClick={goNext}
            disabled={!canNext}
            className="flex h-12 items-center justify-center rounded-xl bg-sky-400 px-8 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            다음
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={goPrev}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl border border-stone-300 px-6 text-sm font-medium hover:bg-white sm:w-auto"
        >
          이전
        </button>
      )}
    </div>
  );
}

function CharacterPickGrid({
  characters,
  selectedId,
  onSelect,
}: {
  characters: OrderCharacterOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {characters.map((character) => {
        const selectable = character.status === "COMPLETED";
        const selected = character.id === selectedId;
        const imageSrc =
          character.status === "COMPLETED" && character.generatedImagePath
            ? character.generatedImagePath
            : character.originalPhotoPath;

        return (
          <button
            key={character.id}
            type="button"
            disabled={!selectable}
            aria-pressed={selected}
            onClick={() => selectable && onSelect(character.id)}
            className={cn(
              "relative overflow-hidden rounded-xl border bg-white text-left shadow-sm",
              selectable ? "cursor-pointer" : "cursor-not-allowed",
              selected
                ? "border-sky-400 ring-2 ring-sky-300"
                : selectable
                  ? "border-stone-200 hover:border-stone-400"
                  : "border-stone-200",
              !selectable && "opacity-60",
            )}
          >
            <div className="no-image-save relative aspect-square bg-stone-100">
              <AppImage
                src={imageSrc}
                alt={character.label}
                fill
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
                className={cn(
                  "pointer-events-none object-cover",
                  !selectable && "grayscale",
                )}
                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
              />
              <div
                className="pointer-events-none absolute inset-0"
                onContextMenu={(event) => event.preventDefault()}
              />
              {!selectable ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45">
                  {character.status === "FAILED" ? (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium">
                      생성 실패
                    </span>
                  ) : (
                    <div className="rounded-xl bg-white/95 px-2 py-1.5">
                      <GenerationProgress kind="character" id={character.id} />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="px-1.5 py-1.5">
              <p className="truncate text-center text-xs font-semibold sm:text-sm">
                {character.label}
              </p>
              <p className="truncate text-center text-[11px] text-stone-500">
                {GENDER_LABEL[character.gender]}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
