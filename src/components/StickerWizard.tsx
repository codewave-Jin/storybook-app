"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { createStickerOrder, type CreateStickerOrderState } from "@/app/actions/stickers";
import { AppImage } from "@/components/AppImage";
import { GenerationProgress } from "@/components/GenerationProgress";
import { StickerCheckoutDialog } from "@/components/StickerCheckoutDialog";
import { StickerLayerEditor } from "@/components/StickerLayerEditor";
import { StickerPreviewViews } from "@/components/StickerPreviewViews";
import { GENDER_LABEL } from "@/lib/orders";
import {
  cloneStickerLayout,
  type StickerLayoutState,
} from "@/lib/sticker-layout-constants";
import {
  STICKER_PHRASE_OPTIONS,
  serializeStickerPhrase,
} from "@/lib/sticker-phrase";
import {
  STICKER_BORDER_CATEGORY_LABEL,
  STICKER_BORDER_CATEGORY_ORDER,
  type StickerBorderCategoryKey,
} from "@/lib/templates";
import { cn } from "@/lib/utils";

export type StickerCharacterOption = {
  id: string;
  label: string;
  gender: "MALE" | "FEMALE";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  generatedImagePath: string | null;
  originalPhotoPath: string;
};

export type StickerBorderOption = {
  id: string;
  label: string;
  thumbnailPath: string | null;
  imageUrl: string;
  category: StickerBorderCategoryKey;
  sortOrder: number;
};

export type StickerSizeOption = {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  quantityPerA4: number;
  available: boolean;
};

const STEP_COUNT = 5;
const STEP_LABELS = ["캐릭터", "테두리", "문구", "미리보기", "결제"] as const;

export function StickerWizard({
  characters,
  borders,
  sizes,
  defaultEmail,
  defaultName,
}: {
  characters: StickerCharacterOption[];
  borders: StickerBorderOption[];
  sizes: StickerSizeOption[];
  defaultEmail?: string;
  defaultName?: string;
}) {
  const [step, setStep] = useState(1);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [borderId, setBorderId] = useState<string | null>(null);
  const [categoryTab, setCategoryTab] = useState<StickerBorderCategoryKey | null>(
    null,
  );
  const [phraseKey, setPhraseKey] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [cutoutPath, setCutoutPath] = useState<string | null>(null);
  const [borderPreviewUrl, setBorderPreviewUrl] = useState<string | null>(null);
  const [layout, setLayout] = useState<StickerLayoutState>(cloneStickerLayout);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [baking, setBaking] = useState(false);
  const [sizeOptionId, setSizeOptionId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [state, formAction] = useFormState<CreateStickerOrderState, FormData>(
    createStickerOrder,
    undefined,
  );

  const selectedCharacter = characters.find((item) => item.id === characterId);
  const selectedBorder = borders.find((item) => item.id === borderId);
  const selectedSize = sizes.find((item) => item.id === sizeOptionId);
  const selectedPhrase = STICKER_PHRASE_OPTIONS.find((item) => item.key === phraseKey);
  const phrase = selectedPhrase
    ? serializeStickerPhrase({ title, body })
    : "";
  const categoryTabs = useMemo(() => {
    const present = new Set(borders.map((border) => border.category));
    return STICKER_BORDER_CATEGORY_ORDER.filter((category) =>
      present.has(category),
    );
  }, [borders]);
  const activeCategory = categoryTab ?? categoryTabs[0] ?? "NONE";
  const visibleBorders = useMemo(
    () =>
      borders
        .filter((border) => border.category === activeCategory)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [borders, activeCategory],
  );

  const canNext = useMemo(() => {
    if (step === 1) return Boolean(characterId);
    if (step === 2) return Boolean(borderId);
    if (step === 3) {
      return Boolean(selectedPhrase?.enabled);
    }
    if (step === 4) {
      return Boolean(cutoutPath) && !previewing && !baking;
    }
    if (step === 5) {
      return Boolean(
        sizeOptionId &&
          sizes.find((item) => item.id === sizeOptionId)?.available,
      );
    }
    return true;
  }, [
    step,
    characterId,
    borderId,
    selectedPhrase,
    cutoutPath,
    previewing,
    baking,
    sizeOptionId,
    sizes,
  ]);

  async function composePreview() {
    if (!characterId || !borderId || !phrase) {
      return false;
    }
    setPreviewing(true);
    setPreviewError(null);
    setPreviewPath(null);
    setCutoutPath(null);
    try {
      const response = await fetch("/api/stickers/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          borderId,
          phrase,
          bake: false,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        cutoutImagePath?: string;
        borderImageUrl?: string;
        error?: string;
      } | null;
      if (!response.ok || !payload?.cutoutImagePath) {
        throw new Error(payload?.error ?? "미리보기를 만들지 못했습니다.");
      }
      setCutoutPath(payload.cutoutImagePath);
      setBorderPreviewUrl(payload.borderImageUrl ?? selectedBorder?.imageUrl ?? null);
      setLayout(cloneStickerLayout());
      setLayoutDirty(false);
      return true;
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "미리보기를 만들지 못했습니다.",
      );
      return false;
    } finally {
      setPreviewing(false);
    }
  }

  async function bakePreview() {
    if (!characterId || !borderId || !phrase || !cutoutPath) {
      return false;
    }
    setBaking(true);
    setPreviewError(null);
    try {
      const response = await fetch("/api/stickers/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          borderId,
          phrase,
          cutoutImagePath: cutoutPath,
          layout,
          bake: true,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        previewImagePath?: string;
        error?: string;
      } | null;
      if (!response.ok || !payload?.previewImagePath) {
        throw new Error(payload?.error ?? "배치를 적용하지 못했습니다.");
      }
      setPreviewPath(payload.previewImagePath);
      setLayoutDirty(false);
      return true;
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "배치를 적용하지 못했습니다.",
      );
      return false;
    } finally {
      setBaking(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-stone-500">
          {step}/{STEP_COUNT} · {STEP_LABELS[step - 1]}
        </p>
        <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
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
            옷이 입혀진 캐릭터를 그대로 스티커에 올려요.
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
          <h2 className="text-lg font-semibold">테두리를 골라 주세요</h2>
          <p className="mt-1 text-sm text-stone-500">
            스티커 가장자리에 들어갈 디자인을 선택해요.
          </p>
          {borders.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-12 text-center text-sm text-stone-500">
              선택 가능한 테두리가 없습니다.
            </p>
          ) : (
            <>
              {categoryTabs.length > 1 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {categoryTabs.map((category) => {
                    const selected = category === activeCategory;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setCategoryTab(category)}
                        className={cn(
                          "h-10 rounded-full px-4 text-sm font-medium",
                          selected
                            ? "bg-sky-400 text-white"
                            : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-sky-50",
                        )}
                      >
                        {STICKER_BORDER_CATEGORY_LABEL[category]}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {visibleBorders.map((border) => {
                  const selected = border.id === borderId;
                  const thumb = border.thumbnailPath || border.imageUrl;
                  return (
                    <button
                      key={border.id}
                      type="button"
                      onClick={() => {
                        setBorderId(border.id);
                        setCategoryTab(border.category);
                      }}
                      className={cn(
                        "overflow-hidden rounded-2xl border bg-white text-left shadow-sm hover:border-stone-300",
                        selected
                          ? "border-sky-400 ring-2 ring-sky-300"
                          : "border-stone-200",
                      )}
                    >
                      <div className="relative aspect-square bg-[#F6E7C1]/40">
                        {thumb ? (
                          <AppImage
                            src={thumb}
                            alt={border.label}
                            fill
                            className="object-contain p-2"
                            sizes="(max-width: 640px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-3xl font-semibold text-[#8A5A12]">
                            {border.label.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <p className="p-3 font-semibold">{border.label}</p>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section>
          <h2 className="text-lg font-semibold">문구를 선택해 주세요</h2>
          <p className="mt-1 text-sm text-stone-500">
            지금은 생일만 만들 수 있어요.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STICKER_PHRASE_OPTIONS.map((item) => {
              const selected = phraseKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={!item.enabled}
                  onClick={() => {
                    if (!item.enabled) {
                      return;
                    }
                    setPhraseKey(item.key);
                    setTitle(item.title);
                    setBody(item.body);
                    setPreviewPath(null);
                    setCutoutPath(null);
                    setLayout(cloneStickerLayout());
                    setLayoutDirty(false);
                  }}
                  className={cn(
                    "relative rounded-2xl border bg-white p-5 text-left shadow-sm",
                    selected
                      ? "border-sky-400 ring-2 ring-sky-300"
                      : "border-stone-200",
                    item.enabled
                      ? "hover:border-stone-300"
                      : "cursor-not-allowed opacity-55",
                  )}
                >
                  {item.enabled ? null : (
                    <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-stone-500 ring-1 ring-stone-200">
                      준비 중
                    </span>
                  )}
                  <p className="font-semibold">{item.label}</p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section>
          <h2 className="text-lg font-semibold">스티커 미리보기</h2>
          {previewing ? (
            <>
              <p className="mt-1 text-sm text-stone-500">
                배경을 지우고 테두리와 문구를 배치하고 있어요.
              </p>
              <div className="mt-6 rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-stone-200">
                <p className="text-lg font-semibold">배경을 지우고 배치하는 중</p>
                <p className="mt-2 text-sm text-stone-500">
                  잠시만 기다려 주세요. 끝나면 미리보기가 나타나요.
                </p>
              </div>
            </>
          ) : previewError && !cutoutPath ? (
            <div className="mt-6 rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-stone-200">
              <p className="text-lg font-semibold">미리보기에 실패했어요</p>
              <p className="mt-2 text-sm text-stone-500">{previewError}</p>
              <button
                type="button"
                onClick={() => void composePreview()}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-sky-400 px-5 text-sm font-medium text-white"
              >
                다시 만들기
              </button>
            </div>
          ) : cutoutPath ? (
            <div className="mt-4">
              <StickerLayerEditor
                borderSrc={borderPreviewUrl ?? selectedBorder?.imageUrl}
                characterSrc={cutoutPath}
                title={title}
                body={body}
                phrase={phrase}
                layout={layout}
                onChange={(next) => {
                  setLayout(next);
                  setLayoutDirty(true);
                }}
                onPhraseChange={(next) => {
                  setTitle(next.title);
                  setBody(next.body);
                  setLayoutDirty(true);
                }}
              />
              {previewError ? (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {previewError}
                </p>
              ) : null}
              {baking ? (
                <p className="mt-3 text-center text-sm text-stone-500">
                  배치를 적용하는 중이에요.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 5 ? (
        <section>
          <h2 className="text-lg font-semibold">결제</h2>
          <p className="mt-1 text-sm text-stone-500">
            사이즈를 고르면 A4 미리보기가 바뀌어요. 장수는 결제할 때 선택해요.
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
          {previewPath && selectedSize ? (
            <div className="mt-5">
              <StickerPreviewViews
                src={previewPath}
                phrase={phrase}
                quantity={selectedSize.quantityPerA4}
                overlayPhrase={false}
                showWatermark
                variant="a4"
              />
              <p className="mt-2 text-center text-sm text-stone-500">
                {selectedSize.label} · A4 한 장에 {selectedSize.quantityPerA4}개
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            {state?.error && !checkoutOpen ? (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setCheckoutOpen(true)}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#E07A5F] text-base font-medium text-white hover:bg-[#d56c51] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
            >
              결제하기
            </button>
          </div>
          <StickerCheckoutDialog
            open={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            optionLines={[
              ...(selectedCharacter
                ? [{ label: "캐릭터", value: selectedCharacter.label }]
                : []),
              ...(selectedBorder
                ? [{ label: "테두리", value: selectedBorder.label }]
                : []),
              ...(selectedSize
                ? [{ label: "사이즈", value: selectedSize.label }]
                : []),
              ...(title ? [{ label: "문구", value: title }] : []),
            ]}
            defaultEmail={defaultEmail}
            defaultName={defaultName}
            error={state?.error}
            formAction={formAction}
            hiddenFields={
              <>
                <input type="hidden" name="characterId" value={characterId ?? ""} />
                <input type="hidden" name="borderId" value={borderId ?? ""} />
                <input type="hidden" name="phrase" value={phrase} />
                <input type="hidden" name="sizeOptionId" value={sizeOptionId ?? ""} />
                <input type="hidden" name="previewImagePath" value={previewPath ?? ""} />
              </>
            }
          />
        </section>
      ) : null}

      {step !== 5 ? (
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
            onClick={() => {
              if (step === 3) {
                setStep(4);
                if (!cutoutPath) {
                  void composePreview();
                }
                return;
              }
              if (step === 4) {
                void (async () => {
                  if (!previewPath || layoutDirty) {
                    const baked = await bakePreview();
                    if (!baked) {
                      return;
                    }
                  }
                  if (!sizeOptionId) {
                    const firstAvailable = sizes.find((item) => item.available);
                    if (firstAvailable) {
                      setSizeOptionId(firstAvailable.id);
                    }
                  }
                  setStep(5);
                })();
                return;
              }
              setStep((current) => Math.min(current + 1, STEP_COUNT));
            }}
            disabled={!canNext}
            className="flex h-12 items-center justify-center rounded-xl bg-sky-400 px-8 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {step === 3 ? "만들고 미리보기" : baking ? "배치 적용 중" : "다음"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setStep(4)}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl border border-stone-300 px-6 text-sm font-medium hover:bg-white sm:w-auto"
        >
          이전
        </button>
      )}
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
