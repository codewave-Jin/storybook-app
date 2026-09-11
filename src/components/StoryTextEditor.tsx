"use client";

import { useEffect, useState, useTransition } from "react";
import { saveOrderStoryText } from "@/app/actions/story-text";
import {
  StoryPrintNotice,
  StoryTextOverlay,
} from "@/components/StoryTextOverlay";

export function StoryTextEditor({
  illustrationId,
  initialText,
}: {
  illustrationId: string;
  initialText: string;
}) {
  const [text, setText] = useState(initialText);
  const [draft, setDraft] = useState(initialText);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startSave] = useTransition();

  useEffect(() => {
    setText(initialText);
    setDraft(initialText);
    setEditing(false);
    setError(null);
  }, [illustrationId, initialText]);

  if (!initialText && !text && !editing) {
    return null;
  }

  if (!editing) {
    return (
      <StoryTextOverlay
        lines={text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)}
        action={
          <button
            type="button"
            onClick={() => {
              setDraft(text);
              setEditing(true);
              setError(null);
            }}
            className="h-7 rounded-lg border border-stone-300 bg-white px-2.5 text-xs font-medium text-stone-700 shadow-sm hover:bg-stone-50"
          >
            글 수정
          </button>
        }
      />
    );
  }

  return (
    <div className="border-t border-amber-900/10 bg-[#fff8ee] px-3 py-2 sm:px-5 sm:py-2.5">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={Math.min(12, Math.max(4, draft.split("\n").length + 1))}
        className="font-story w-full resize-y rounded-xl border border-amber-900/15 bg-white px-3 py-2 text-sm leading-snug text-stone-800 outline-none focus:ring-2 focus:ring-sky-300"
      />
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startSave(async () => {
              const result = await saveOrderStoryText({
                illustrationId,
                storyText: draft,
              });
              if (result.error) {
                setError(result.error);
                return;
              }
              setText(result.storyText ?? draft);
              setEditing(false);
            });
          }}
          className="h-9 rounded-lg bg-sky-400 px-3 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {pending ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setDraft(text);
            setEditing(false);
            setError(null);
          }}
          className="h-9 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-600"
        >
          취소
        </button>
      </div>
      <StoryPrintNotice />
    </div>
  );
}
