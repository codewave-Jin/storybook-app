"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import {
  payForStickerOrder,
  saveStickerDraft,
  type PayStickerOrderState,
} from "@/app/actions/stickers";
import { AppImage } from "@/components/AppImage";
import { GenerationProgress } from "@/components/GenerationProgress";
import { PaymentComingSoon } from "@/components/PaymentComingSoon";
import { SpecialStickerPanel } from "@/components/SpecialStickerPanel";
import { StickerCheckoutDialog } from "@/components/StickerCheckoutDialog";
import { StickerLayerEditor } from "@/components/StickerLayerEditor";
import { StickerPreviewViews } from "@/components/StickerPreviewViews";
import { StickerTokenConfirmDialog } from "@/components/StickerTokenConfirmDialog";
import { GENDER_LABEL } from "@/lib/orders";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import {
  STICKER_EXAMPLES,
  configForMakeMode,
  layoutForMakeMode,
  phrasesForExample,
  type StickerExampleKey,
  type StickerMakeMode,
} from "@/lib/sticker-examples";
import {
  cloneStickerLayout,
  type StickerLayoutState,
} from "@/lib/sticker-layout-constants";
import { serializeStickerPhrases } from "@/lib/sticker-phrase";
import {
  defaultPhraseForClothingTopic,
  type ClothingTopicKey,
  type SpecialGender,
  type SpecialStickerKind,
} from "@/lib/sticker-special";
import {
  isTransparentStickerBorder,
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
  key: string;
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

const STEP_COUNT = 4;
const STEP_LABELS = ["캐릭터", "만들기", "제작하기", "사이즈"] as const;

export function StickerWizard({
  characters,
  borders,
  sizes,
  tokenBalance = 0,
  defaultEmail,
  defaultName,
}: {
  characters: StickerCharacterOption[];
  borders: StickerBorderOption[];
  sizes: StickerSizeOption[];
  tokenBalance?: number;
  defaultEmail?: string;
  defaultName?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [makePath, setMakePath] = useState<"path" | "examples" | "special">("path");
  const [makeMode, setMakeMode] = useState<StickerMakeMode | null>(null);
  const [specialKind, setSpecialKind] = useState<SpecialStickerKind | null>(null);
  const [clothingTopic, setClothingTopic] = useState<ClothingTopicKey | null>(null);
  const [specialName, setSpecialName] = useState("");
  const [specialGender, setSpecialGender] = useState<SpecialGender | "">("");
  const [specialPhrase, setSpecialPhrase] = useState("");
  const [tokens, setTokens] = useState(tokenBalance);
  const [specialConfirmOpen, setSpecialConfirmOpen] = useState(false);
  const [specialGenerating, setSpecialGenerating] = useState(false);
  const [specialError, setSpecialError] = useState<string | null>(null);
  const [specialHoldId, setSpecialHoldId] = useState<string | null>(null);
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [borderId, setBorderId] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [cutoutPath, setCutoutPath] = useState<string | null>(null);
  const [borderPreviewUrl, setBorderPreviewUrl] = useState<string | null>(null);
  const [layout, setLayout] = useState<StickerLayoutState>(cloneStickerLayout);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [baking, setBaking] = useState(false);
  const [sizeOptionId, setSizeOptionId] = useState<string | null>(null);
  const [payState, payAction] = useFormState<PayStickerOrderState, FormData>(
    payForStickerOrder,
    undefined,
  );
  const composedKeyRef = useRef("");

  const selectedCharacter = characters.find((item) => item.id === characterId);
  const selectedBorder = borders.find((item) => item.id === borderId);
  const selectedSize = sizes.find((item) => item.id === sizeOptionId);
  const phrase = serializeStickerPhrases(layout.phrases.map((item) => item.text));

  const canNext = useMemo(() => {
    if (step === 1) {
      return Boolean(
        characterId &&
          characters.find((item) => item.id === characterId)?.status === "COMPLETED",
      );
    }
    if (step === 3) {
      return Boolean(characterId && cutoutPath) && !previewing && !baking && !savingDraft;
    }
    if (step === 4) {
      return Boolean(
        sizeOptionId &&
          sizes.find((item) => item.id === sizeOptionId)?.available,
      );
    }
    return false;
  }, [
    step,
    characterId,
    characters,
    cutoutPath,
    previewing,
    baking,
    savingDraft,
    sizeOptionId,
    sizes,
  ]);

  function applyMakeMode(mode: StickerMakeMode) {
    const characterLabel = selectedCharacter?.label ?? "";
    const config = configForMakeMode(mode, characterLabel);
    const border = borders.find((item) => item.key === config.borderKey);
    setMakeMode(mode);
    setBorderId(border?.id ?? null);
    setBorderPreviewUrl(border?.imageUrl ?? null);
    setLayout(layoutForMakeMode(mode, characterLabel));
    setPreviewPath(null);
    setLayoutDirty(true);
    setStep(3);
  }

  function openSpecialPath() {
    setMakePath("special");
    setSpecialKind(null);
    setClothingTopic(null);
    setSpecialError(null);
  }

  function selectSpecialKind(kind: SpecialStickerKind) {
    setSpecialKind(kind);
    setSpecialError(null);
    if (kind === "nametag") {
      setSpecialName((current) => current || selectedCharacter?.label || "");
      setSpecialGender((current) => current || selectedCharacter?.gender || "");
      return;
    }
    setClothingTopic(null);
    setSpecialPhrase("");
  }

  function selectClothingTopic(topic: ClothingTopicKey) {
    setClothingTopic(topic);
    setSpecialPhrase(defaultPhraseForClothingTopic(topic));
    setSpecialError(null);
  }

  function applySpecialGenerated(imagePath: string) {
    const characterLabel = selectedCharacter?.label ?? "";
    const config = configForMakeMode("special", characterLabel);
    const border = borders.find((item) => item.key === config.borderKey);
    setMakeMode("special");
    setBorderId(border?.id ?? null);
    setBorderPreviewUrl(border?.imageUrl ?? null);
    setLayout(layoutForMakeMode("special", characterLabel));
    setCutoutPath(imagePath);
    composedKeyRef.current = characterId ?? "";
    setPreviewPath(null);
    setLayoutDirty(true);
    setSpecialConfirmOpen(false);
    setStep(3);
  }

  async function generateSpecialSticker() {
    if (!characterId || !specialKind) {
      return;
    }
    setSpecialGenerating(true);
    setSpecialError(null);
    try {
      const response = await fetch("/api/stickers/generate-special", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          specialKind === "nametag"
            ? {
                characterId,
                kind: "nametag",
                name: specialName.trim(),
                gender: specialGender,
              }
            : {
                characterId,
                kind: "clothing",
                topic: clothingTopic,
                phrase: specialPhrase.trim(),
              },
        ),
      });
      const payload = (await response.json().catch(() => null)) as {
        imagePath?: string;
        tokens?: number;
        holdId?: string;
        orderId?: string;
        error?: string;
      } | null;
      if (!response.ok || !payload?.imagePath) {
        throw new Error(payload?.error ?? "이미지를 만들지 못했습니다.");
      }
      if (typeof payload.tokens === "number") {
        setTokens(payload.tokens);
      } else {
        setTokens((current) => Math.max(0, current - 1));
      }
      setSpecialHoldId(payload.holdId ?? null);
      if (payload.orderId) {
        setDraftOrderId(payload.orderId);
      }
      applySpecialGenerated(payload.imagePath);
    } catch (error) {
      setSpecialError(
        error instanceof Error ? error.message : "이미지를 만들지 못했습니다.",
      );
      setSpecialConfirmOpen(false);
    } finally {
      setSpecialGenerating(false);
    }
  }

  async function composePreview() {
    if (!characterId || !borderId) {
      return false;
    }
    const composeKey = characterId;
    composedKeyRef.current = composeKey;
    setPreviewing(true);
    setPreviewError(null);
    setPreviewPath(null);
    try {
      const response = await fetch("/api/stickers/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          borderId,
          phrase,
          cutoutImagePath: cutoutPath,
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
      if (composedKeyRef.current !== composeKey) {
        return false;
      }
      setCutoutPath(payload.cutoutImagePath);
      setBorderPreviewUrl(payload.borderImageUrl ?? selectedBorder?.imageUrl ?? null);
      setLayoutDirty(true);
      return true;
    } catch (error) {
      if (composedKeyRef.current !== composeKey) {
        return false;
      }
      setPreviewError(
        error instanceof Error ? error.message : "미리보기를 만들지 못했습니다.",
      );
      return false;
    } finally {
      if (composedKeyRef.current === composeKey) {
        setPreviewing(false);
      }
    }
  }

  async function bakePreview() {
    if (!characterId || !borderId || !cutoutPath) {
      return null;
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
      return payload.previewImagePath;
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "배치를 적용하지 못했습니다.",
      );
      return null;
    } finally {
      setBaking(false);
    }
  }

  function ensureSizeSelected() {
    if (sizeOptionId) {
      return sizeOptionId;
    }
    const firstAvailable = sizes.find((item) => item.available);
    if (firstAvailable) {
      setSizeOptionId(firstAvailable.id);
      return firstAvailable.id;
    }
    return null;
  }

  async function persistDraft(options?: {
    sizeOptionId?: string | null;
    previewImagePath?: string | null;
  }) {
    const selectedSizeId = options?.sizeOptionId ?? sizeOptionId;
    const imagePath = options?.previewImagePath ?? previewPath;
    if (!characterId || !borderId || !selectedSizeId) {
      return { error: "사이즈를 선택해 주세요." };
    }
    const form = new FormData();
    if (draftOrderId) {
      form.set("orderId", draftOrderId);
    }
    form.set("characterId", characterId);
    form.set("borderId", borderId);
    form.set("phrase", phrase);
    form.set("sizeOptionId", selectedSizeId);
    form.set("previewImagePath", imagePath ?? "");
    if (makeMode === "special" && specialHoldId) {
      form.set("tokenHoldId", specialHoldId);
    }
    const result = await saveStickerDraft(form);
    if (result.orderId) {
      setDraftOrderId(result.orderId);
    }
    return result;
  }

  async function goToPayment() {
    if (!canNext) {
      return;
    }
    setSavingDraft(true);
    setPreviewError(null);
    try {
      const result = await persistDraft();
      if (result.error || !result.orderId) {
        setPreviewError(result.error ?? "진행 중인 작업을 저장하지 못했습니다.");
        return;
      }
      if (!PAYMENTS_ENABLED) {
        router.push(`/dashboard/sticker/${result.orderId}/preview`);
        return;
      }
      setCheckoutOpen(true);
    } finally {
      setSavingDraft(false);
    }
  }

  useEffect(() => {
    if (payState?.success && draftOrderId) {
      setCheckoutOpen(false);
      router.push(`/dashboard/sticker/${draftOrderId}/preview`);
    }
  }, [payState, draftOrderId, router]);

  useEffect(() => {
    setTokens(tokenBalance);
  }, [tokenBalance]);

  useEffect(() => {
    if (step !== 3 || !characterId || !borderId) {
      return;
    }
    if (makeMode === "special") {
      setBorderPreviewUrl((current) => current ?? selectedBorder?.imageUrl ?? null);
      return;
    }
    if (cutoutPath && composedKeyRef.current === characterId) {
      setBorderPreviewUrl((current) => current ?? selectedBorder?.imageUrl ?? null);
      return;
    }
    void composePreview();
    // Character change rebuilds the cutout; example/border reuse it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, characterId, borderId, makeMode]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-stone-500">
          {step}/{STEP_COUNT} · {STEP_LABELS[step - 1]}
        </p>
        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
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

      {step === 2 && makePath === "path" ? (
        <section>
          <h2 className="text-lg font-semibold">어떻게 만들까요?</h2>
          <p className="mt-1 text-sm text-stone-500">
            예시를 고르거나, 직접 만들거나, 특수 제작으로 시작할 수 있어요.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setMakePath("examples")}
              className="rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm hover:border-stone-300"
            >
              <p className="font-semibold">예시 선택</p>
              <p className="mt-1 text-sm text-stone-500">
                생일, 감사, 축하 예시로 바로 시작해요.
              </p>
            </button>
            <button
              type="button"
              onClick={() => applyMakeMode("diy")}
              className="rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm hover:border-stone-300"
            >
              <p className="font-semibold">직접 만들기</p>
              <p className="mt-1 text-sm text-stone-500">빈 원형에서 문구를 넣어요.</p>
            </button>
            <button
              type="button"
              onClick={openSpecialPath}
              className="rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm hover:border-stone-300"
            >
              <p className="font-semibold">특수 제작</p>
              <p className="mt-1 text-sm text-stone-500">원하는 디자인을 따로 맞춰 드려요.</p>
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 && makePath === "examples" ? (
        <section>
          <h2 className="text-lg font-semibold">예시를 골라 주세요</h2>
          <p className="mt-1 text-sm text-stone-500">
            문구만 보여 드려요. 고르면 제작하기에서 바로 고칠 수 있어요.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STICKER_EXAMPLES.map((example) => {
              const phrases = phrasesForExample(
                example.key,
                selectedCharacter?.label ?? "",
              );
              return (
              <button
                key={example.key}
                type="button"
                onClick={() => applyMakeMode(example.key as StickerExampleKey)}
                className={cn(
                  "rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-stone-300",
                  makeMode === example.key
                    ? "border-sky-400 ring-2 ring-sky-300"
                    : "border-stone-200",
                )}
              >
                <p className="font-semibold">{example.label}</p>
                <p className="mt-3 text-base font-medium text-stone-800">
                  {phrases[0]}
                </p>
                {phrases[1] ? (
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-600">
                    {phrases[1]}
                  </p>
                ) : null}
                {phrases[2] ? (
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-600">
                    {phrases[2]}
                  </p>
                ) : null}
              </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === 2 && makePath === "special" ? (
        <SpecialStickerPanel
          kind={specialKind}
          clothingTopic={clothingTopic}
          name={specialName}
          gender={specialGender}
          phrase={specialPhrase}
          tokenBalance={tokens}
          generating={specialGenerating}
          error={specialError}
          onKindChange={selectSpecialKind}
          onClothingTopicChange={selectClothingTopic}
          onNameChange={setSpecialName}
          onGenderChange={setSpecialGender}
          onPhraseChange={setSpecialPhrase}
          onGenerate={() => {
            if (tokens < 1) {
              setSpecialError("토큰이 부족합니다");
              return;
            }
            setSpecialConfirmOpen(true);
          }}
        />
      ) : null}

      {step === 3 ? (
        <section>
          <h2 className="text-lg font-semibold">제작하기</h2>
          <p className="mt-1 text-sm text-stone-500">
            문구와 위치를 바로 수정할 수 있어요.
          </p>
          <div className="mt-4">
            <StickerLayerEditor
              borderSrc={borderPreviewUrl ?? selectedBorder?.imageUrl}
              characterSrc={cutoutPath}
              layout={layout}
              borders={borders}
              borderId={borderId}
              transparentCanvas={
                selectedBorder ? isTransparentStickerBorder(selectedBorder) : false
              }
              onChange={(next) => {
                setLayout(next);
                setLayoutDirty(true);
              }}
              onBorderChange={(nextBorderId) => {
                const border = borders.find((item) => item.id === nextBorderId);
                if (!border) {
                  return;
                }
                setBorderId(border.id);
                setBorderPreviewUrl(border.imageUrl);
                setLayoutDirty(true);
              }}
            />
            {previewing ? (
              <p className="mt-3 text-center text-sm text-stone-500">
                캐릭터 배경을 지우고 있어요. 예시는 바로 고칠 수 있어요.
              </p>
            ) : null}
            {previewError ? (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <p>{previewError}</p>
                <button
                  type="button"
                  onClick={() => void composePreview()}
                  className="mt-2 font-medium underline"
                >
                  다시 만들기
                </button>
              </div>
            ) : null}
            {baking ? (
              <p className="mt-3 text-center text-sm text-stone-500">
                배치를 적용하는 중이에요.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section>
          <h2 className="text-lg font-semibold">사이즈를 골라 주세요</h2>
          <p className="mt-1 text-sm text-stone-500">
            사이즈를 고르면 A4 미리보기가 바뀌어요. 미리보기 확인 후 바로 결제할 수 있어요.
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

          {previewError ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {previewError}
            </p>
          ) : null}

          <div className="mt-6">
            {PAYMENTS_ENABLED ? (
              <button
                type="button"
                disabled={!canNext || savingDraft}
                onClick={() => void goToPayment()}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#E07A5F] text-base font-medium text-white hover:bg-[#d56c51] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
              >
                {savingDraft ? "준비 중..." : "결제하기"}
              </button>
            ) : (
              <PaymentComingSoon kind="sticker" />
            )}
          </div>
        </section>
      ) : null}

      {step !== 4 ? (
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                if (specialGenerating) {
                  return;
                }
                if (step === 2 && makePath === "examples") {
                  setMakePath("path");
                  return;
                }
                if (step === 2 && makePath === "special") {
                  if (specialKind === "clothing" && clothingTopic) {
                    setClothingTopic(null);
                    return;
                  }
                  if (specialKind) {
                    setSpecialKind(null);
                    return;
                  }
                  setMakePath("path");
                  return;
                }
                if (step === 3) {
                  setMakePath(
                    makeMode === "diy"
                      ? "path"
                      : makeMode === "special"
                        ? "special"
                        : "examples",
                  );
                  setStep(2);
                  return;
                }
                setStep((current) => Math.max(current - 1, 1));
              }}
              disabled={specialGenerating}
              className="flex h-12 items-center justify-center rounded-xl border border-stone-300 px-6 text-sm font-medium hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
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
          {step === 2 ? (
            <span className="hidden sm:block" />
          ) : (
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  setMakePath("path");
                  setStep(2);
                  return;
                }
                if (step === 3) {
                  void (async () => {
                    let bakedPath = previewPath;
                    if (!bakedPath || layoutDirty) {
                      const baked = await bakePreview();
                      if (!baked) {
                        return;
                      }
                      bakedPath = baked;
                    }
                    const nextSizeId = ensureSizeSelected();
                    if (!nextSizeId) {
                      setPreviewError("사이즈를 선택해 주세요.");
                      return;
                    }
                    setSavingDraft(true);
                    try {
                      const result = await persistDraft({
                        sizeOptionId: nextSizeId,
                        previewImagePath: bakedPath,
                      });
                      if (result.error) {
                        setPreviewError(result.error);
                        return;
                      }
                      setStep(4);
                    } finally {
                      setSavingDraft(false);
                    }
                  })();
                }
              }}
              disabled={!canNext}
              className="flex h-12 items-center justify-center rounded-xl bg-sky-400 px-8 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {baking || savingDraft ? "저장 중" : "다음"}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setStep(3)}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl border border-stone-300 px-6 text-sm font-medium hover:bg-white sm:w-auto"
        >
          이전
        </button>
      )}
      <StickerTokenConfirmDialog
        open={specialConfirmOpen}
        tokens={tokens}
        pending={specialGenerating}
        onClose={() => {
          if (!specialGenerating) {
            setSpecialConfirmOpen(false);
          }
        }}
        onConfirm={() => {
          void generateSpecialSticker();
        }}
      />
      {draftOrderId && PAYMENTS_ENABLED ? (
        <StickerCheckoutDialog
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          optionLines={[
            {
              label: "캐릭터",
              value: selectedCharacter?.label ?? "",
            },
            ...(selectedBorder
              ? [{ label: "테두리", value: selectedBorder.label }]
              : []),
            ...(selectedSize
              ? [{ label: "사이즈", value: selectedSize.label }]
              : []),
          ]}
          defaultEmail={defaultEmail}
          defaultName={defaultName}
          error={payState?.error}
          formAction={payAction}
          hiddenFields={<input type="hidden" name="orderId" value={draftOrderId} />}
        />
      ) : null}
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
