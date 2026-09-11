"use client";

import { useEffect, useState, useTransition } from "react";
import { saveAdminStoryText } from "@/app/actions/story-text";

export function AdminStoryTextPanel({
  illustrationId,
  initialText,
}: {
  illustrationId: string;
  initialText: string;
}) {
  const [text, setText] = useState(initialText);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startSave] = useTransition();

  useEffect(() => {
    setText(initialText);
    setError(null);
  }, [illustrationId, initialText]);

  if (!initialText && !text) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-[#fff8ee] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-700">최종 본문 글</p>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
          className="h-8 rounded-lg border border-stone-300 bg-white px-2.5 text-xs font-medium hover:bg-stone-50"
        >
          {copied ? "복사됨" : "글 복사"}
        </button>
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={Math.min(12, Math.max(4, text.split("\n").length + 1))}
        className="w-full resize-y rounded-lg border border-amber-900/15 bg-white px-3 py-2 text-sm leading-snug text-stone-800 outline-none focus:ring-2 focus:ring-sky-300"
      />
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startSave(async () => {
            const result = await saveAdminStoryText({
              illustrationId,
              storyText: text,
            });
            if (result.error) {
              setError(result.error);
              return;
            }
            setError(null);
          });
        }}
        className="mt-2 h-8 rounded-lg bg-sky-400 px-3 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60"
      >
        {pending ? "저장 중..." : "글 저장"}
      </button>
    </div>
  );
}

export function AdminAllStoryCopyButton({
  pages,
}: {
  pages: Array<{ label: string; text: string }>;
}) {
  const [copied, setCopied] = useState(false);
  const payload = pages
    .filter((page) => page.text.trim())
    .map((page) => `${page.label}\n${page.text}`)
    .join("\n\n-----\n\n");

  if (!payload) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(payload);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="h-10 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-50"
    >
      {copied ? "전체 글 복사됨" : "전체 최종 글 복사"}
    </button>
  );
}
