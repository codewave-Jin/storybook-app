"use client";

import Link from "next/link";
import { AppImage } from "@/components/AppImage";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { GenerationProgress } from "@/components/GenerationProgress";
import { createOrder, type CreateOrderState } from "@/app/actions/orders";
import type { CustomField } from "@/lib/templates";
import { cn } from "@/lib/utils";

export type OrderTemplateOption = {
  id: string;
  title: string;
  description: string | null;
  customFields: CustomField[];
};

export type OrderCharacterOption = {
  id: string;
  label: string;
  gender: "MALE" | "FEMALE";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  generatedImagePath: string | null;
  originalPhotoPath: string;
};

const STEP_LABELS = ["동화책 유형", "캐릭터", "추가 정보", "미리보기"] as const;
const GENDER_LABEL = {
  MALE: "남자아이",
  FEMALE: "여자아이",
} as const;

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
  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [state, formAction] = useFormState<CreateOrderState, FormData>(
    createOrder,
    undefined,
  );

  const selectedTemplate = templates.find((template) => template.id === templateId);
  const customFields = selectedTemplate?.customFields ?? [];
  const selectedCharacters = characters.filter((character) =>
    characterIds.includes(character.id),
  );

  const canSkipFields = customFields.length === 0;

  function goNext() {
    if (step === 2 && canSkipFields) {
      setStep(4);
      return;
    }
    setStep((current) => Math.min(current + 1, 4));
  }

  function goPrev() {
    if (step === 4 && canSkipFields) {
      setStep(2);
      return;
    }
    setStep((current) => Math.max(current - 1, 1));
  }

  function toggleCharacter(id: string, selectable: boolean) {
    if (!selectable) return;

    setCharacterIds((current) => {
      if (current.includes(id)) {
        return current.filter((value) => value !== id);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, id];
    });
  }

  const canNext = useMemo(() => {
    if (step === 1) return Boolean(templateId);
    if (step === 2) return characterIds.length >= 1 && characterIds.length <= 3;
    if (step === 3) {
      return customFields.every((field) => customValues[field.key]?.trim());
    }
    return true;
  }, [step, templateId, characterIds, customFields, customValues]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-stone-500">
          {step}/4 · {STEP_LABELS[step - 1]}
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {STEP_LABELS.map((label, index) => {
            const number = index + 1;
            const active = number === step;
            const skipped = canSkipFields && number === 3;
            const done = number < step || (skipped && step > 3);

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

      {step === 1 ? (
        <section>
          <h2 className="text-lg font-semibold">동화책 유형을 선택해 주세요</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const selected = template.id === templateId;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    setTemplateId(template.id);
                    setCustomValues({});
                  }}
                  className={cn(
                    "rounded-2xl border bg-white p-5 text-left shadow-sm transition",
                    selected
                      ? "border-sky-400 ring-2 ring-sky-300"
                      : "border-stone-200 hover:border-stone-400",
                  )}
                >
                  <h3 className="text-base font-semibold">{template.title}</h3>
                  <p className="mt-2 text-sm text-stone-500">
                    {template.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section>
          <h2 className="text-lg font-semibold">등장할 캐릭터를 선택해 주세요</h2>
          <p className="mt-1 text-sm text-stone-500">
            생성이 완료된 캐릭터만 선택할 수 있습니다. 최대 3명.
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
              <p className="mt-3 text-sm text-stone-500">
                {characterIds.length}/3명 선택됨
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {characters.map((character) => {
                  const selectable = character.status === "COMPLETED";
                  const selected = characterIds.includes(character.id);
                  const imageSrc =
                    character.status === "COMPLETED" && character.generatedImagePath
                      ? character.generatedImagePath
                      : character.originalPhotoPath;

                  return (
                    <label
                      key={character.id}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border bg-white shadow-sm",
                        selectable ? "cursor-pointer" : "cursor-not-allowed",
                        selected
                          ? "border-sky-400 ring-2 ring-sky-300"
                          : "border-stone-200",
                        !selectable && "opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selected}
                        disabled={!selectable}
                        onChange={() => toggleCharacter(character.id, selectable)}
                      />
                      <div className="no-image-save relative aspect-[4/5] bg-stone-100">
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
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                        <div
                          className="pointer-events-none absolute inset-0"
                          onContextMenu={(event) => event.preventDefault()}
                        />
                        {!selectable ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45">
                            {character.status === "FAILED" ? (
                              <span className="rounded-full bg-white px-3 py-1 text-sm font-medium">
                                생성 실패
                              </span>
                            ) : (
                              <div className="rounded-2xl bg-white/95 px-4 py-3">
                                <GenerationProgress
                                  kind="character"
                                  id={character.id}
                                />
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <div className="p-4">
                        <p className="font-semibold">{character.label}</p>
                        <p className="text-sm text-stone-500">
                          {GENDER_LABEL[character.gender]}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section>
          <h2 className="text-lg font-semibold">추가 정보를 입력해 주세요</h2>
          <div className="mt-4 space-y-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-8">
            {customFields.map((field) => (
              <label
                key={field.key}
                className="flex flex-col gap-1.5 text-sm font-medium text-stone-700"
              >
                {field.label}
                <input
                  type="text"
                  value={customValues[field.key] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    setCustomValues((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  className="h-12 rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                />
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section>
          <h2 className="text-lg font-semibold">주문 내용을 확인해 주세요</h2>
          <div className="mt-4 space-y-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-8">
            <div>
              <p className="text-sm text-stone-500">동화책</p>
              <p className="mt-1 font-medium">{selectedTemplate?.title}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">선택한 캐릭터</p>
              <ul className="mt-1 space-y-1">
                {selectedCharacters.map((character) => (
                  <li key={character.id} className="font-medium">
                    {character.label} ({GENDER_LABEL[character.gender]})
                  </li>
                ))}
              </ul>
            </div>
            {customFields.length > 0 ? (
              <div>
                <p className="text-sm text-stone-500">추가 입력</p>
                <ul className="mt-1 space-y-1">
                  {customFields.map((field) => (
                    <li key={field.key}>
                      <span className="text-stone-500">{field.label}: </span>
                      <span className="font-medium">
                        {customValues[field.key]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="rounded-lg bg-[#F6E7C1]/70 px-3 py-2 text-sm text-[#8A5A12]">
              지금은 결제 없이 표지와 장면 2장을 먼저 만들어요. 마음에 들면
              미리보기에서 나머지 이야기를 결제할 수 있습니다.
            </p>
          </div>

          <form action={formAction} className="mt-6">
            <input type="hidden" name="templateId" value={templateId ?? ""} />
            {characterIds.map((id) => (
              <input key={id} type="hidden" name="characterIds" value={id} />
            ))}
            {customFields.map((field) => (
              <input
                key={field.key}
                type="hidden"
                name={`custom:${field.key}`}
                value={customValues[field.key] ?? ""}
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

      {step !== 4 ? (
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={goPrev}
              className="flex h-12 items-center justify-center rounded-xl border border-stone-300 px-6 text-sm font-medium hover:bg-white"
            >
              이전
            </button>
          ) : (
            <span />
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
