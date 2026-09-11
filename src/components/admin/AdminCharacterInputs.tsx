"use client";

import { AppImage } from "@/components/AppImage";
import { useFormState, useFormStatus } from "react-dom";
import {
  selectOrderCharacterInput,
  uploadOrderCharacterInput,
  type IllustrationActionState,
} from "@/app/actions/illustrations";
import type { WorkCharacter } from "@/components/admin/CharacterZoomGrid";
import {
  illustrationCharacterInputUrl,
  parseRegenInputChoice,
} from "@/lib/character-regen-input";
import { cn } from "@/lib/utils";

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-8 rounded-lg border border-stone-300 bg-white px-2.5 text-[11px] font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
    >
      {pending ? "올리는 중..." : "올리기"}
    </button>
  );
}

function ThumbSelectButton({
  src,
  title,
  selected,
}: {
  src: string;
  title: string;
  selected: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={selected ? `${title} (재생성 입력)` : `${title} 선택`}
      className={cn(
        "relative h-14 w-14 overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-200 disabled:opacity-60",
        selected && "ring-2 ring-sky-400 ring-offset-1",
      )}
    >
      <AppImage src={src} alt={title} fill className="object-cover" sizes="56px" />
      {selected ? (
        <span className="absolute inset-x-0 bottom-0 bg-sky-500/90 py-px text-center text-[9px] font-semibold leading-none text-white">
          사용
        </span>
      ) : null}
    </button>
  );
}

function CharacterThumbOption({
  orderId,
  characterId,
  choice,
  inputUrl,
  src,
  title,
  selected,
  downloadHref,
}: {
  orderId: string;
  characterId: string;
  choice: "original" | "styled" | "upload";
  inputUrl?: string;
  src: string;
  title: string;
  selected: boolean;
  downloadHref: string;
}) {
  const [state, action] = useFormState<IllustrationActionState, FormData>(
    selectOrderCharacterInput,
    undefined,
  );

  return (
    <div className="flex w-[72px] flex-col items-center">
      <form action={action}>
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="characterId" value={characterId} />
        <input type="hidden" name="choice" value={choice} />
        {inputUrl ? <input type="hidden" name="inputUrl" value={inputUrl} /> : null}
        <ThumbSelectButton src={src} title={title} selected={selected} />
      </form>
      <span className="mt-1 w-full truncate text-center text-[10px] font-medium text-stone-600">
        {title}
      </span>
      <a
        href={downloadHref}
        className="text-[10px] font-medium text-sky-700 underline-offset-2 hover:underline"
      >
        받기
      </a>
      {state?.error ? (
        <p className="mt-1 text-center text-[10px] text-red-600">{state.error}</p>
      ) : null}
    </div>
  );
}

function CharacterInputBlock({
  orderId,
  character,
}: {
  orderId: string;
  character: WorkCharacter;
}) {
  const [uploadState, uploadAction] = useFormState<
    IllustrationActionState,
    FormData
  >(uploadOrderCharacterInput, undefined);

  const originalSrc = character.originalSrc || character.imageSrc || null;
  const styledSrc =
    character.styledSrc && character.styledSrc !== originalSrc
      ? character.styledSrc
      : null;
  const uploads = (character.regenUploads ?? []).filter((src) => {
    return src && src !== originalSrc && src !== styledSrc;
  });
  const storedChoice = parseRegenInputChoice(character.regenInputChoice);
  const choice =
    storedChoice ??
    (character.regenOverrideSrc &&
    uploads.includes(character.regenOverrideSrc)
      ? "upload"
      : null);
  const selectedSrc = illustrationCharacterInputUrl(
    {
      styledImageUrl: styledSrc,
      regenInputUrl: character.regenOverrideSrc,
      regenInputChoice: choice,
    },
    originalSrc,
  );
  const downloadBase = `/api/admin/orders/${orderId}/characters/${character.id}/download`;
  const originalSelected = Boolean(
    originalSrc && selectedSrc === originalSrc && choice !== "upload",
  );
  const styledSelected = Boolean(
    styledSrc && selectedSrc === styledSrc && choice !== "upload",
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-stone-700">{character.label}</p>
      <div className="flex flex-wrap items-start gap-2">
        {originalSrc ? (
          <CharacterThumbOption
            orderId={orderId}
            characterId={character.id}
            choice="original"
            src={originalSrc}
            title="입력"
            selected={originalSelected}
            downloadHref={`${downloadBase}?variant=original`}
          />
        ) : null}
        {styledSrc ? (
          <CharacterThumbOption
            orderId={orderId}
            characterId={character.id}
            choice="styled"
            src={styledSrc}
            title="그림체"
            selected={styledSelected}
            downloadHref={`${downloadBase}?variant=styled`}
          />
        ) : null}
        {uploads.map((src, index) => (
          <CharacterThumbOption
            key={src}
            orderId={orderId}
            characterId={character.id}
            choice="upload"
            inputUrl={src}
            src={src}
            title={uploads.length > 1 ? `업로드 ${index + 1}` : "업로드"}
            selected={choice === "upload" && selectedSrc === src}
            downloadHref={`${downloadBase}?variant=regen&url=${encodeURIComponent(src)}`}
          />
        ))}
      </div>
      <form action={uploadAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="characterId" value={character.id} />
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp"
          className="min-w-0 flex-1 text-[11px] text-stone-600 file:mr-2 file:h-8 file:rounded-lg file:border-0 file:bg-white file:px-2 file:text-[11px] file:font-medium file:text-stone-700"
        />
        <UploadButton />
      </form>
      {uploadState?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {uploadState.error}
        </p>
      ) : null}
    </div>
  );
}

export function AdminCharacterInputs({
  orderId,
  characters,
}: {
  orderId: string;
  characters: WorkCharacter[];
}) {
  if (characters.length === 0) {
    return <p className="text-sm text-stone-400">선택된 캐릭터가 없습니다.</p>;
  }

  return (
    <div className="space-y-3 rounded-xl border border-stone-100 bg-stone-50 p-3">
      {characters.map((character) => (
        <CharacterInputBlock
          key={character.id}
          orderId={orderId}
          character={character}
        />
      ))}
      <p className="text-[11px] text-stone-500">
        썸네일을 고르면 그 이미지가 재생성 입력 캐릭터가 됩니다.
      </p>
    </div>
  );
}
