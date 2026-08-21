import Image from "next/image";
import type { Character, CharacterStatus, Gender } from "@prisma/client";
import { DeleteCharacterButton } from "@/components/DeleteCharacterButton";

const GENDER_LABEL: Record<Gender, string> = {
  MALE: "남자아이",
  FEMALE: "여자아이",
};

const STATUS_LABEL: Record<CharacterStatus, string> = {
  PENDING: "생성 대기 중",
  PROCESSING: "생성 중",
  COMPLETED: "생성 완료",
  FAILED: "생성 실패",
};

export function CharacterCard({ character }: { character: Character }) {
  const showImage =
    character.status === "COMPLETED" && character.generatedImagePath;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="relative aspect-[4/5] bg-stone-100">
        {showImage ? (
          <Image
            src={character.generatedImagePath!}
            alt={character.label}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
          />
        ) : character.status === "FAILED" ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="text-sm font-medium text-red-600">생성 실패</span>
            <span className="text-xs text-stone-500">
              다시 생성해 주세요
            </span>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
            <span className="text-sm text-stone-500">
              {STATUS_LABEL[character.status]}
            </span>
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
