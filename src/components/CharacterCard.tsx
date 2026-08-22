import type { Character, Gender } from "@prisma/client";
import { AppImage } from "@/components/AppImage";
import { DeleteCharacterButton } from "@/components/DeleteCharacterButton";
import { GenerationProgress } from "@/components/GenerationProgress";

const GENDER_LABEL: Record<Gender, string> = {
  MALE: "남자아이",
  FEMALE: "여자아이",
};

export function CharacterCard({ character }: { character: Character }) {
  const showImage =
    character.status === "COMPLETED" && character.generatedImagePath;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="no-image-save relative aspect-[4/5] bg-stone-100">
        {showImage ? (
          <>
            <AppImage
              src={character.generatedImagePath!}
              alt={character.label}
              fill
              draggable={false}
              className="pointer-events-none object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
            />
            <div className="absolute inset-0" />
          </>
        ) : character.status === "FAILED" ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="text-sm font-medium text-red-600">생성 실패</span>
            <span className="text-xs text-stone-500">
              다시 생성해 주세요
            </span>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <GenerationProgress kind="character" id={character.id} />
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{character.label}</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            {GENDER_LABEL[character.gender]}
          </p>
        </div>
        <DeleteCharacterButton
          characterId={character.id}
          label={character.label}
        />
      </div>
    </article>
  );
}
