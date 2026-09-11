"use client";

import { AppImage } from "@/components/AppImage";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  deleteIllustrationPage,
  requestIllustrationGeneration,
  restoreIllustrationVersion,
  uploadIllustrationReplacement,
  type IllustrationActionState,
} from "@/app/actions/illustrations";
import type { IllustrationVersion } from "@/lib/illustration-versions";
import { type WorkCharacter } from "@/components/admin/CharacterZoomGrid";
import { AdminCharacterInputs } from "@/components/admin/AdminCharacterInputs";
import { GenerationProgress } from "@/components/GenerationProgress";
import { AdminStoryTextPanel } from "@/components/admin/AdminStoryTextPanel";

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
  storyText = "",
  orderId,
}: {
  illustration: {
    id: string;
    pageNumber: number;
    prompt: string;
    imagePath: string | null;
    sceneImagePath: string | null;
    imageVersions?: IllustrationVersion[];
    status: "IDLE" | "PROCESSING" | "COMPLETED" | "FAILED";
    selectedCharacterIds: string[];
    errorReason?: string | null;
    pageType?: "COVER" | "PAGE";
  };
  characters: WorkCharacter[];
  storyText?: string;
  orderId: string;
}) {
  const [state, formAction] = useFormState<IllustrationActionState, FormData>(
    requestIllustrationGeneration,
    undefined,
  );
  const [uploadState, uploadAction] = useFormState<
    IllustrationActionState,
    FormData
  >(uploadIllustrationReplacement, undefined);
  const [restoreState, restoreAction] = useFormState<
    IllustrationActionState,
    FormData
  >(restoreIllustrationVersion, undefined);
  const [isDeleting, startDelete] = useTransition();
  const generateLockRef = useRef(false);
  const [generateLocked, setGenerateLocked] = useState(false);

  const generateFormId = `illustration-generate-${illustration.id}`;
  const processing = illustration.status === "PROCESSING";
  const failed = illustration.status === "FAILED";
  const hasImage = Boolean(illustration.imagePath);
  const previewSrc = illustration.sceneImagePath || illustration.imagePath;
  const generateBusy = processing || generateLocked;
  const isCover = illustration.pageType === "COVER";
  const pageLabel = isCover ? "표지" : `${illustration.pageNumber}페이지`;
  const selectedCharacters = characters.filter((character) =>
    illustration.selectedCharacterIds.includes(character.id),
  );
  const previousVersions = (illustration.imageVersions ?? []).filter(
    (item) => item.path && item.path !== previewSrc,
  );
  const canRegenerate = Boolean(illustration.prompt.trim()) && !generateBusy;

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
      <div
        className={
          isCover
            ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]"
            : "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]"
        }
      >
        <div>
        <div className="overflow-hidden rounded-xl bg-stone-100">
          <div
            className={
              isCover
                ? "relative mx-auto aspect-square w-full max-w-[440px] xl:mx-0 xl:max-w-none"
                : "relative mx-auto aspect-[2/1] w-full max-w-xl xl:mx-0 xl:max-w-none"
            }
          >
            {previewSrc ? (
              <AppImage
                src={previewSrc}
                alt={pageLabel}
                fill
                className="object-contain"
                sizes={
                  isCover
                    ? "(max-width: 1280px) 100vw, 440px"
                    : "(max-width: 1280px) 100vw, 520px"
                }
              />
            ) : failed ? (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
                <span className="text-sm font-medium text-red-600">
                  생성 실패
                </span>
                {illustration.errorReason ? (
                  <span className="max-w-full break-words text-xs text-stone-500">
                    {illustration.errorReason}
                  </span>
                ) : (
                  <span className="text-xs text-stone-500">
                    다시 생성해 주세요
                  </span>
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
        </div>
        {previousVersions.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-stone-600">
              이전 버전
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {previousVersions
                .slice()
                .reverse()
                .map((version, index) => (
                  <form
                    key={`${version.path}-${index}`}
                    action={restoreAction}
                    className="overflow-hidden rounded-xl border border-stone-200 bg-white"
                  >
                    <input
                      type="hidden"
                      name="illustrationId"
                      value={illustration.id}
                    />
                    <input
                      type="hidden"
                      name="versionPath"
                      value={version.path}
                    />
                    <div
                      className={
                        isCover
                          ? "relative aspect-square bg-stone-100"
                          : "relative aspect-[2/1] bg-stone-100"
                      }
                    >
                      <AppImage
                        src={version.path}
                        alt={`이전 버전 ${index + 1}`}
                        fill
                        className="object-contain"
                        sizes="160px"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={generateBusy}
                      className="h-9 w-full border-t border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                    >
                      이 버전으로 되돌리기
                    </button>
                  </form>
                ))}
            </div>
            {restoreState?.error ? (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {restoreState.error}
              </p>
            ) : null}
          </div>
        ) : null}
        </div>

        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold">{pageLabel}</h3>
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
                  삽화 다운로드
                </a>
              ) : null}
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  if (!confirm(`${pageLabel}를 삭제할까요?`)) {
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

          {!isCover ? (
            <AdminStoryTextPanel
              illustrationId={illustration.id}
              initialText={storyText}
            />
          ) : null}

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-stone-600">
              재생성에 들어갈 캐릭터
            </p>
            <AdminCharacterInputs
              orderId={orderId}
              characters={selectedCharacters}
            />
          </div>

          <form
            id={generateFormId}
            action={formAction}
            onSubmit={(event) => {
              if (generateLockRef.current || processing || !canRegenerate) {
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
            <input type="hidden" name="prompt" value={illustration.prompt} />
            {illustration.selectedCharacterIds.map((id) => (
              <input key={id} type="hidden" name="characterIds" value={id} />
            ))}

            <div>
              <p className="mb-2 text-sm font-medium text-stone-600">
                기존 프롬프트
              </p>
              {illustration.prompt.trim() ? (
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700">
                  {illustration.prompt}
                </pre>
              ) : (
                <p className="rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-400">
                  저장된 프롬프트가 없습니다.
                </p>
              )}
            </div>

            <p className="text-sm text-stone-500">
              이미지가 이상하면 같은 프롬프트로 다시 만들어 사용자 삽화를
              고칩니다.
            </p>

            <ActionButton
              form={generateFormId}
              label={hasImage ? "재생성" : "생성하기"}
              pendingLabel="생성 중..."
              busy={processing}
              disabled={!canRegenerate}
              className="h-11 w-full rounded-xl bg-sky-400 px-5 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
            />

            {state?.error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            ) : null}
          </form>

          <form action={uploadAction} className="mt-6 space-y-3 border-t border-stone-200 pt-4">
            <input type="hidden" name="illustrationId" value={illustration.id} />
            <p className="text-sm font-medium text-stone-600">파일 올리기</p>
            <p className="text-sm text-stone-500">
              포토샵으로 수정한 JPG, PNG, WEBP를 올리면 현재 삽화를 바꿉니다.
              이전 그림은 위에 남습니다.
            </p>
            <input
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={generateBusy}
              className="block w-full text-sm text-stone-600 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
            />
            <ActionButton
              label="파일 올리기"
              pendingLabel="올리는 중..."
              busy={generateBusy}
              disabled={generateBusy}
              className="h-11 w-full rounded-xl border border-stone-300 bg-white px-5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60 sm:w-auto"
            />
            {uploadState?.error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {uploadState.error}
              </p>
            ) : null}
            {uploadState?.success ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                파일을 올렸습니다.
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </article>
  );
}
