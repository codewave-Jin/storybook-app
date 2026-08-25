"use client";

import { AppImage } from "@/components/AppImage";
import { useState } from "react";
import { GENDER_LABEL } from "@/lib/orders";
import { cn } from "@/lib/utils";

export type WorkCharacter = {
  id: string;
  label: string;
  gender: "MALE" | "FEMALE";
  imageSrc: string;
};

export function CharacterZoomGrid({
  characters,
}: {
  characters: WorkCharacter[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = characters.find((character) => character.id === activeId);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {characters.map((character) => (
          <button
            key={character.id}
            type="button"
            onClick={() => setActiveId(character.id)}
            className="overflow-hidden rounded-xl border border-stone-200 bg-white text-left hover:border-stone-400"
          >
            <div className="relative aspect-[4/5] bg-stone-100">
              <AppImage
                src={character.imageSrc}
                alt={character.label}
                fill
                className="object-cover"
                sizes="200px"
              />
            </div>
            <div className="p-3">
              <p className="font-medium">{character.label}</p>
              <p className="text-sm text-stone-500">
                {GENDER_LABEL[character.gender]}
              </p>
            </div>
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 sm:p-8"
          onClick={() => setActiveId(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-[4/5] bg-stone-100">
              <AppImage
                src={active.imageSrc}
                alt={active.label}
                fill
                className="object-contain"
                sizes="800px"
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{active.label}</p>
                <p className="text-sm text-stone-500">
                  {GENDER_LABEL[active.gender]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="h-10 rounded-lg border border-stone-300 px-4 text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CharacterThumbnails({
  characters,
}: {
  characters: WorkCharacter[];
}) {
  if (characters.length === 0) {
    return <p className="text-sm text-stone-400">선택된 캐릭터가 없습니다.</p>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {characters.map((character) => (
        <div key={character.id} className="flex items-center gap-2">
          <span className="relative h-10 w-10 overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-200">
            <AppImage
              src={character.imageSrc}
              alt={character.label}
              fill
              className="object-cover"
              sizes="40px"
            />
          </span>
          <span className="text-xs font-medium text-stone-600">
            {character.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CharacterSelectList({
  characters,
  selectedIds,
}: {
  characters: WorkCharacter[];
  selectedIds: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {characters.map((character) => (
        <label
          key={character.id}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-xl border bg-white p-1.5 pr-3",
            "has-[:checked]:border-sky-400 has-[:checked]:ring-2 has-[:checked]:ring-sky-300",
          )}
        >
          <input
            type="checkbox"
            name="characterIds"
            value={character.id}
            defaultChecked={selectedIds.includes(character.id)}
            className="h-4 w-4 accent-sky-400"
          />
          <span className="relative h-8 w-8 overflow-hidden rounded-md bg-stone-100">
            <AppImage
              src={character.imageSrc}
              alt={character.label}
              fill
              className="object-cover"
              sizes="32px"
            />
          </span>
          <span>
            <span className="block text-sm font-medium">{character.label}</span>
            <span className="block text-xs text-stone-500">
              {GENDER_LABEL[character.gender]}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
