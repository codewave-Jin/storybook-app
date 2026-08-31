"use client";

import { AppImage } from "@/components/AppImage";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  deleteIllustrationPage,
  requestIllustrationExpressionEdit,
  requestIllustrationGeneration,
  restoreIllustrationSceneOriginal,
  type IllustrationActionState,
} from "@/app/actions/illustrations";
import {
  CharacterSelectList,
  type WorkCharacter,
} from "@/components/admin/CharacterZoomGrid";
import { GenerationProgress } from "@/components/GenerationProgress";
import {
  EXPRESSION_OPTIONS,
  type ExpressionValue,
} from "@/lib/expressions";

const EDITABLE_EXPRESSIONS = EXPRESSION_OPTIONS.filter(
  (option) => option.value !== "default",
);

function ActionButton({
  label,
  pendingLabel,
  className,
  disabled,
  busy,
  form,
}: {
  label: string;
  pendingLabel: string;
  className: string;
  disabled?: boolean;
  busy?: boolean;
  form?: string;
}) {
  const { pending } = useFormStatus();
  const isBusy = pending || busy;
  const isDisabled = isBusy || disabled;

  return (
    <button type="submit" form={form} disabled={isDisabled} className={className}>
      {isBusy ? pendingLabel : label}
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
    sceneImagePath: string | null;
    status: "IDLE" | "PROCESSING" | "COMPLETED" | "FAILED";
    selectedCharacterIds: string[];
    errorReason?: string | null;
  };
  characters: WorkCharacter[];
}) {
  const [state, formAction] = useFormState<IllustrationActionState, FormData>(
    requestIllustrationGeneration,
    undefined,
  );
  const [expressionState, expressionAction] = useFormState<
    IllustrationActionState,
    FormData
  >(requestIllustrationExpressionEdit, undefined);
  const [restoreState, restoreAction] = useFormState<
    IllustrationActionState,
    FormData
  >(restoreIllustrationSceneOriginal, undefined);
  const [isDeleting, startDelete] = useTransition();
  const [koreanInput, setKoreanInput] = useState("");
  const [expression, setExpression] = useState<ExpressionValue | null>(null);
  const [englishPrompt, setEnglishPrompt] = useState(illustration.prompt);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const generateLockRef = useRef(false);
  const [generateLocked, setGenerateLocked] = useState(false);

  useEffect(() => {
    setEnglishPrompt(illustration.prompt);
    setKoreanInput("");
    setExpression(null);
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

  const generateFormId = `illustration-generate-${illustration.id}`;
  const expressionFormId = `illustration-expression-${illustration.id}`;
  const restoreFormId = `illustration-restore-${illustration.id}`;
  const processing = illustration.status === "PROCESSING";
  const failed = illustration.status === "FAILED";
  const hasImage = Boolean(illustration.imagePath);
  const generateBusy = processing || generateLocked;
  const canRestore =
    Boolean(
      illustration.sceneImagePath &&
        illustration.imagePath &&
        illustration.sceneImagePath !== illustration.imagePath,
    ) && !generateBusy;

  useEffect(() => {
    if (processing) {
      generateLockRef.current = true;
      setGenerateLocked(true);
      return;
    }

    generateLockRef.current = false;
    setGenerateLocked(false);
  }, [processing, illustration.status, illustration.imagePath]);

  return (
    <article className="space-y-6 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-stone-100 xl:mx-0 xl:max-w-none">
        {illustration.imagePath ? (
          <AppImage
            src={illustration.imagePath}
            alt={`${illustration.pageNumber}페이지`}
            fill
            className="object-contain"
            sizes="(max-width: 1280px) 100vw, 280px"
          />
        ) : failed ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="text-sm font-medium text-red-600">생성 실패</span>
            {illustration.errorReason ? (
              <span className="max-w-full break-words text-xs text-stone-500">
                {illustration.errorReason}
              </span>
            ) : (
              <span className="text-xs text-stone-500">다시 생성해 주세요</span>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-[220px] items-center justify-center px-4 text-center text-sm text-stone-400">
            아직 생성된 이미지가 없습니다
          </div>
        )}
        {processing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70">
            <GenerationProgress kind="illustration" id={illustration.id} />
          </div>
        ) : null}
      </div>

      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">
              {illustration.pageNumber}페이지
            </h3>
            {failed && illustration.errorReason ? (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {illustration.errorReason}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
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
          id={generateFormId}
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-stone-600">
                장면 설명 (한글)
                <textarea
                  value={koreanInput}
                  onChange={(event) => setKoreanInput(event.target.value)}
                  rows={8}
                  placeholder='예: "바다 위 배에서 해적 놀이하는 장면"'
                  className="mt-2 min-h-[160px] w-full rounded-xl border border-stone-300 px-4 py-3 text-base leading-7 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 lg:min-h-[220px]"
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
                  rows={8}
                  placeholder="AI 변환 결과가 여기에 채워집니다. 직접 수정할 수도 있습니다."
                  className="mt-2 min-h-[160px] w-full rounded-xl border border-stone-300 px-4 py-3 text-base leading-7 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 lg:min-h-[220px]"
                />
              </label>
              <div className="mt-3">
                <ActionButton
                  form={generateFormId}
                  label={hasImage ? "재생성" : "생성하기"}
                  pendingLabel="생성 중..."
                  busy={processing}
                  disabled={generateBusy}
                  className="h-11 w-full rounded-xl bg-sky-400 px-5 text-sm font-medium text-white disabled:opacity-60"
                />
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
      </div>

      <form
        id={expressionFormId}
        action={expressionAction}
        onSubmit={(event) => {
          if (!hasImage || !expression || generateLockRef.current || processing) {
            event.preventDefault();
            return;
          }
          generateLockRef.current = true;
          setGenerateLocked(true);
        }}
        className="border-t border-stone-200 pt-5"
      >
        <input type="hidden" name="illustrationId" value={illustration.id} />
        {expression ? (
          <input type="hidden" name="expression" value={expression} />
        ) : null}
        <p className="text-sm font-medium text-stone-700">표정 바꾸기</p>
        <p className="mt-1 text-sm text-stone-500">
          장면 생성이 끝난 뒤에, 선택한 표정만 다시 생성합니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EDITABLE_EXPRESSIONS.map((option) => {
            const selected = expression === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setExpression(option.value)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  selected
                    ? "border-sky-400 bg-sky-400 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {option.hint ? `${option.label} (${option.hint})` : option.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex w-full flex-col gap-2 sm:max-w-xs">
          <ActionButton
            form={expressionFormId}
            label="변환"
            pendingLabel="표정 변경 중..."
            busy={processing}
            disabled={generateBusy || !hasImage || !expression}
            className="h-11 w-full rounded-xl bg-sky-400 px-5 text-sm font-medium text-white disabled:opacity-60"
          />
        </div>
        {expressionState?.error ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {expressionState.error}
          </p>
        ) : null}
      </form>
      <form
        id={restoreFormId}
        action={restoreAction}
        className="mt-2 w-full sm:max-w-xs"
      >
        <input type="hidden" name="illustrationId" value={illustration.id} />
        <ActionButton
          form={restoreFormId}
          label="되돌리기"
          pendingLabel="되돌리는 중..."
          busy={processing}
          disabled={!canRestore}
          className="h-11 w-full rounded-xl border border-stone-300 bg-white px-5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
        />
      </form>
      {!hasImage ? (
        <p className="mt-2 text-sm text-stone-400">
          먼저 삽화를 생성해야 표정을 바꿀 수 있습니다.
        </p>
      ) : !canRestore && !generateBusy ? (
        <p className="mt-2 text-sm text-stone-400">
          처음 만든 장면 원본입니다.
        </p>
      ) : null}
      {restoreState?.error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {restoreState.error}
        </p>
      ) : null}
    </article>
  );
}
