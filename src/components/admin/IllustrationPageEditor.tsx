"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  deleteIllustrationPage,
  requestIllustrationGeneration,
  type IllustrationActionState,
} from "@/app/actions/illustrations";
import {
  CharacterSelectList,
  type WorkCharacter,
} from "@/components/admin/CharacterZoomGrid";

function ActionButton({
  label,
  pendingLabel,
  className,
  disabled,
}: {
  label: string;
  pendingLabel: string;
  className: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button type="submit" disabled={isDisabled} className={className}>
      {pending || disabled ? pendingLabel : label}
    </button>
  );
}

export function IllustrationPageEditor({
  illustration,
  characters,
}: {
  illustration: {
    id: string;
    pageNumber: number;
    prompt: string;
    imagePath: string | null;
    status: "IDLE" | "PROCESSING" | "COMPLETED" | "FAILED";
    selectedCharacterIds: string[];
  };
  characters: WorkCharacter[];
}) {
  const [state, formAction] = useFormState<IllustrationActionState, FormData>(
    requestIllustrationGeneration,
    undefined,
  );
  const [isDeleting, startDelete] = useTransition();
  const [koreanInput, setKoreanInput] = useState("");
  const [englishPrompt, setEnglishPrompt] = useState(illustration.prompt);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const generateLockRef = useRef(false);
  const [generateLocked, setGenerateLocked] = useState(false);

  useEffect(() => {
    setEnglishPrompt(illustration.prompt);
    setKoreanInput("");
    setTranslateError(null);
  }, [illustration.id]);

  useEffect(() => {
    setEnglishPrompt(illustration.prompt);
  }, [illustration.prompt]);

  async function translatePrompt() {
    setTranslateError(null);
    if (!koreanInput.trim()) {
      setTranslateError("한글 장면 설명을 입력해 주세요.");
      return;
    }

    setTranslating(true);
    try {
      const response = await fetch("/api/admin/translate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ koreanInput }),
      });
      const payload = (await response.json().catch(() => null)) as {
        prompt?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.prompt) {
        setTranslateError(payload?.error ?? "프롬프트 변환에 실패했습니다.");
        return;
      }

      setEnglishPrompt(payload.prompt);
    } catch {
      setTranslateError("프롬프트 변환에 실패했습니다.");
    } finally {
      setTranslating(false);
    }
  }

  const processing = illustration.status === "PROCESSING";
  const failed = illustration.status === "FAILED";
  const generateBusy = processing || generateLocked;

  useEffect(() => {
    if (processing) {
      generateLockRef.current = true;
      setGenerateLocked(true);
      return;
    }

    if (state?.error || failed) {
      generateLockRef.current = false;
      setGenerateLocked(false);
    }
  }, [failed, processing, state?.error]);

  return (
    <article className="grid grid-cols-[340px_minmax(0,1fr)] gap-6 rounded-2xl border border-stone-200 bg-white p-6">
      <div className="relative min-h-[280px] overflow-hidden rounded-xl bg-stone-100">
        {illustration.imagePath ? (
          <Image
            src={illustration.imagePath}
            alt={`${illustration.pageNumber}페이지`}
            fill
            className="object-contain"
            sizes="340px"
          />
        ) : failed ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="text-sm font-medium text-red-600">생성 실패</span>
            <span className="text-xs text-stone-500">다시 생성해 주세요</span>
          </div>
        ) : (
          <div className="flex h-full min-h-[280px] items-center justify-center px-4 text-center text-sm text-stone-400">
            아직 생성된 이미지가 없습니다
          </div>
        )}
        {processing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
            <span className="text-sm font-medium text-stone-700">생성 중</span>
          </div>
        ) : null}
      </div>

      <div>
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold">
            {illustration.pageNumber}페이지
          </h3>
          <div className="flex gap-2">
            {illustration.imagePath ? (
              <a
                href={`/api/admin/illustrations/${illustration.id}/download`}
                className="flex h-9 items-center rounded-lg border border-stone-300 px-3 text-sm font-medium hover:bg-stone-50"
              >
                원본 다운로드
              </a>
            ) : null}
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                if (!confirm(`${illustration.pageNumber}페이지를 삭제할까요?`)) {
                  return;
                }
                startDelete(async () => {
                  await deleteIllustrationPage(illustration.id);
                });
              }}
              className="h-9 rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? "삭제 중..." : "페이지 삭제"}
            </button>
          </div>
        </div>

        <form
          action={formAction}
          onSubmit={(event) => {
            if (generateLockRef.current || processing) {
              event.preventDefault();
            } else {
              generateLockRef.current = true;
              setGenerateLocked(true);
            }
          }}
          className="mt-4 space-y-4"
        >
          <input type="hidden" name="illustrationId" value={illustration.id} />
          <input
            type="hidden"
            name="keepImage"
            value={illustration.imagePath ? "1" : "0"}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-stone-600">
              이 페이지에서 사용할 캐릭터
            </p>
            <CharacterSelectList
              characters={characters}
              selectedIds={illustration.selectedCharacterIds}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-stone-600">
                장면 설명 (한글)
                <textarea
                  value={koreanInput}
                  onChange={(event) => setKoreanInput(event.target.value)}
                  rows={10}
                  placeholder='예: "바다 위 배에서 해적 놀이하는 장면"'
                  className="mt-2 min-h-[220px] w-full rounded-xl border border-stone-300 px-4 py-3 text-base leading-7 outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900"
                />
              </label>
              <button
                type="button"
                disabled={translating}
                onClick={() => {
                  void translatePrompt();
                }}
                className="mt-3 h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-50 disabled:opacity-60"
              >
                {translating ? "변환 중..." : "AI 변환"}
              </button>
            </div>

            <div className="flex flex-col">
              <label className="block text-sm font-medium text-stone-600">
                영어 프롬프트
                <textarea
                  name="prompt"
                  value={englishPrompt}
                  onChange={(event) => setEnglishPrompt(event.target.value)}
                  rows={10}
                  placeholder="AI 변환 결과가 여기에 채워집니다. 직접 수정할 수도 있습니다."
                  className="mt-2 min-h-[220px] w-full rounded-xl border border-stone-300 px-4 py-3 text-base leading-7 outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900"
                />
              </label>
              <div className="mt-3">
                {illustration.imagePath ? (
                  <ActionButton
                    label="재생성"
                    pendingLabel="생성 중..."
                    disabled={generateBusy}
                    className="h-11 w-full rounded-xl bg-stone-900 px-5 text-sm font-medium text-white disabled:opacity-60"
                  />
                ) : (
                  <ActionButton
                    label="생성하기"
                    pendingLabel="생성 중..."
                    disabled={generateBusy}
                    className="h-11 w-full rounded-xl bg-stone-900 px-5 text-sm font-medium text-white disabled:opacity-60"
                  />
                )}
              </div>
            </div>
          </div>

          {translateError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {translateError}
            </p>
          ) : null}

          {state?.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}
        </form>
      </div>
    </article>
  );
}
