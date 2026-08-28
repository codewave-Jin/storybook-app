import type { Character } from "@prisma/client";
import Link from "next/link";
import { AppImage } from "@/components/AppImage";
import { DeleteCharacterButton } from "@/components/DeleteCharacterButton";

function StatusLabel({ status }: { status: Character["status"] }) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 sm:px-2 sm:text-[11px]">
        완성
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 sm:px-2 sm:text-[11px]">
        실패
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FDE8E0] px-1.5 py-0.5 text-[10px] font-medium text-[#E07A5F] sm:px-2 sm:text-[11px]">
      <span className="inline-block h-2 w-2 animate-spin rounded-full border border-[#E07A5F] border-t-transparent sm:h-2.5 sm:w-2.5" />
      생성 중
    </span>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-white/80 border-t-[#E07A5F] sm:h-8 sm:w-8"
    />
  );
}

export function CharacterCard({ character }: { character: Character }) {
  const isGenerating =
    character.status === "PENDING" || character.status === "PROCESSING";
  const completedImage =
    character.status === "COMPLETED" && character.generatedImagePath
      ? character.generatedImagePath
      : null;
  const previewImage = completedImage ?? character.originalPhotoPath;

  return (
    <article className="flex flex-col gap-1 sm:gap-2">
      <div className="no-image-save relative aspect-square overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-stone-200 sm:rounded-2xl">
        {previewImage ? (
          <AppImage
            src={previewImage}
            alt={character.label}
            fill
            draggable={false}
            className="pointer-events-none object-cover"
            sizes="(max-width: 640px) 25vw, (max-width: 1024px) 20vw, 16vw"
          />
        ) : null}

        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/70 sm:gap-2">
            <Spinner />
            <span className="hidden text-sm font-medium text-[#E07A5F] sm:inline">
              생성 중
            </span>
          </div>
        ) : null}

        {character.status === "FAILED" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/85 px-1 text-center sm:px-3">
            <span className="text-[10px] font-medium text-red-600 sm:text-sm">
              생성 실패
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-1 px-0.5">
        <div className="min-w-0">
          <h2 className="truncate text-[11px] font-semibold text-stone-800 sm:text-sm">
            {character.label}
          </h2>
          <div className="mt-0.5 sm:mt-1">
            <StatusLabel status={character.status} />
          </div>
        </div>
        <DeleteCharacterButton
          compact
          characterId={character.id}
          label={character.label}
        />
      </div>
    </article>
  );
}

export function AddCharacterSlot({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-sky-300 bg-white/70 text-sky-600 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 sm:gap-2 sm:rounded-2xl"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F6E7C1] text-base font-semibold text-[#8A5A12] sm:h-10 sm:w-10 sm:text-xl">
        +
      </span>
      <span className="text-[10px] font-medium sm:text-sm">추가</span>
    </Link>
  );
}
