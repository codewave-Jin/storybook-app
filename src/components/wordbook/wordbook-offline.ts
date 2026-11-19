"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 단어 그림책을 기기에 저장해 인터넷 없이도 열리게 한다.
 * 그림책 화면을 처음 열 때 서비스 워커(/wordbook/sw.js)를 등록하고
 * 그림·소리·캐릭터 이미지·앱 코드를 한꺼번에 받아 둔다.
 *
 * 개발 서버(npm run dev)에서는 코드가 계속 바뀌어 저장이 잘 맞지 않으니,
 * 오프라인 확인은 npm run build && npm start 로 띄운 뒤에 한다.
 */

export type OfflineStatus =
  | { state: "unsupported" }
  | { state: "idle" }
  | { state: "saving"; done: number; total: number }
  | { state: "saved"; failed: number }
  | { state: "offline" };

const SAVED_KEY = (bookKey: string) => `wordbook-saved:${bookKey}`;

function readSaved(bookKey: string) {
  try {
    return window.localStorage.getItem(SAVED_KEY(bookKey)) === "1";
  } catch {
    return false;
  }
}

function writeSaved(bookKey: string) {
  try {
    window.localStorage.setItem(SAVED_KEY(bookKey), "1");
  } catch {
    // 저장 공간을 못 쓰는 브라우저 (사생활 보호 모드 등)
  }
}

/** 지금 화면이 실제로 불러온 앱 코드·글꼴 주소 (Next 가 만든 파일 이름은 빌드마다 달라서 직접 모은다) */
function loadedResourceUrls() {
  const origin = window.location.origin;
  const urls = new Set<string>();
  for (const entry of performance.getEntriesByType("resource")) {
    const url = entry.name;
    if (!url.startsWith(origin)) continue;
    const path = url.slice(origin.length);
    if (path.startsWith("/_next/static/") || path.startsWith("/fonts/") || path.startsWith("/brand/")) {
      urls.add(url);
    }
  }
  document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((el) => {
    if (el.src.startsWith(`${origin}/_next/static/`)) urls.add(el.src);
  });
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href], link[rel="preload"][href]').forEach((el) => {
    if (el.href.startsWith(`${origin}/_next/static/`) || el.href.startsWith(`${origin}/fonts/`)) urls.add(el.href);
  });
  return [...urls];
}

export function useOfflineBook({
  enabled,
  bookKey,
  assetUrls,
}: {
  /** 결제한 책(또는 개발용 데모)에서만 저장한다 */
  enabled: boolean;
  bookKey: string;
  assetUrls: string[];
}): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>({ state: "idle" });
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("caches" in window)) {
      setStatus({ state: "unsupported" });
      return;
    }
    if (!navigator.onLine) {
      setStatus(readSaved(bookKey) ? { state: "saved", failed: 0 } : { state: "offline" });
      return;
    }
    started.current = true;
    let cancelled = false;

    (async () => {
      try {
        await navigator.serviceWorker.register("/wordbook/sw.js", { scope: "/wordbook/" });
        const registration = await navigator.serviceWorker.ready;
        const worker = registration.active;
        if (!worker || cancelled) return;

        const absolute = assetUrls.map((url) => new URL(url, window.location.origin).href);
        const urls = [...new Set([...absolute, ...loadedResourceUrls()])];
        setStatus({ state: "saving", done: 0, total: urls.length });

        const channel = new MessageChannel();
        channel.port1.onmessage = (event: MessageEvent<{ type: string; done?: number; total?: number; failed?: number }>) => {
          if (cancelled) return;
          const msg = event.data;
          if (msg.type === "progress") {
            setStatus({ state: "saving", done: msg.done ?? 0, total: msg.total ?? urls.length });
          } else if (msg.type === "done") {
            if (!msg.failed) writeSaved(bookKey);
            setStatus({ state: "saved", failed: msg.failed ?? 0 });
          }
        };
        worker.postMessage(
          { type: "cache-book", pageUrl: window.location.href, urls },
          [channel.port2],
        );
      } catch {
        if (!cancelled) setStatus({ state: "unsupported" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, bookKey, assetUrls]);

  return status;
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** 안드로이드 크롬의 "앱 설치" 창을 버튼으로 띄울 수 있게 잡아 둔다 */
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPromptEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return promptEvent
    ? async () => {
        await promptEvent.prompt();
        await promptEvent.userChoice.catch(() => undefined);
        setPromptEvent(null);
      }
    : null;
}
