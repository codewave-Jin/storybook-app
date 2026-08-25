import type { Character } from "@prisma/client";
import Link from "next/link";
import { AppImage } from "@/components/AppImage";
import { DeleteCharacterButton } from "@/components/DeleteCharacterButton";

function StatusLabel({ status }: { status: Character["status"] }) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">
        완성
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
        생성 실패
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FDE8E0] px-2 py-0.5 text-[11px] font-medium text-[#E07A5F]">
      <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-[#E07A5F] border-t-transparent" />
      생성 중
    </span>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-white/80 border-t-[#E07A5F]"
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
    <article className="flex flex-col gap-2">
      <div className="no-image-save relative aspect-square overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
        {previewImage ? (
          <AppImage
            src={previewImage}
            alt={character.label}
            fill
            draggable={false}
            className="pointer-events-none object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : null}

        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70">
            <Spinner />
            <span className="text-sm font-medium text-[#E07A5F]">생성 중</span>
          </div>
        ) : null}

        {character.status === "FAILED" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/85 px-3 text-center">
            <span className="text-sm font-medium text-red-600">생성 실패</span>
            <span className="text-xs text-stone-500">다시 생성해 주세요</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-stone-800">
            {character.label}
          </h2>
          <div className="mt-1">
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
      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sky-300 bg-white/70 text-sky-600 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6E7C1] text-xl font-semibold text-[#8A5A12]">
        +
      </span>
      <span className="text-sm font-medium">캐릭터 추가</span>
    </Link>
  );
}
