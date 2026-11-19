"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { getWordbookTopic, WORDBOOK_STAGE, wordbookAssetUrls, type WordbookTopicId } from "@/lib/wordbook-content";
import { preloadWordbookAssets, stopWordbookAudio, unlockWordbookAudio } from "./wordbook-audio";
import { useInstallPrompt, useOfflineBook } from "./wordbook-offline";
import { HintQuizScreen, SoundGameScreen } from "./WordbookGames";
import { HomeScreen, IntroScreen, StartScreen } from "./WordbookScreens";
import type { WordbookCharacter } from "./wordbook-ui";
import styles from "./wordbook.module.css";

export type { WordbookCharacter } from "./wordbook-ui";

type Screen =
  | { kind: "start" }
  | { kind: "home" }
  | { kind: "intro"; topic: WordbookTopicId; page: number }
  | { kind: "game"; topic: WordbookTopicId; page: number };

type Props = {
  character: WordbookCharacter;
  /** 홈 화면 "나가기" 로 돌아갈 곳 */
  exitHref: string;
  /** 결제 전 미리보기면 오른쪽 아래에 표시 */
  preview?: boolean;
  /** 기기에 저장해 인터넷 없이도 열리게 할지 (결제한 책) */
  offline?: boolean;
  /** 저장 상태를 기억할 이름 (주문 ID) */
  bookKey?: string;
};

// 서버 렌더 때 useLayoutEffect 경고가 나지 않게
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const ROTATE_KEY = "wordbook:rotated";

/**
 * 1194×834 디자인 화면을 기기 화면에 맞춰 비율 그대로 확대·축소한다.
 * rotated 면 화면을 90° 돌려 세로로 든 기기에서도 가로 화면을 크게 본다.
 */
function useStageScale(rotated: boolean) {
  const [scale, setScale] = useState(1);
  useIsomorphicLayoutEffect(() => {
    const update = () => {
      const w = rotated ? WORDBOOK_STAGE.height : WORDBOOK_STAGE.width;
      const h = rotated ? WORDBOOK_STAGE.width : WORDBOOK_STAGE.height;
      const s = Math.min(window.innerWidth / w, window.innerHeight / h);
      setScale(Number.isFinite(s) && s > 0 ? s : 1);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [rotated]);
  return scale;
}

/** 가로·세로 보기 상태 (기기마다 기억) */
function useRotated() {
  const [rotated, setRotated] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(ROTATE_KEY) === "1") setRotated(true);
    } catch {
      // 저장소를 못 쓰면 기본(가로)으로
    }
  }, []);
  const toggle = () =>
    setRotated((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(ROTATE_KEY, next ? "1" : "0");
      } catch {
        // 무시
      }
      return next;
    });
  return [rotated, toggle] as const;
}

/** 시작·홈 화면 왼쪽 아래 가로·세로 보기 버튼 */
function RotateButton({ rotated, onToggle }: { rotated: boolean; onToggle: () => void }) {
  const label = rotated ? "세로 보기" : "가로 보기";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onToggle}
      style={{ position: "absolute", left: 16, bottom: 14, zIndex: 60, display: "flex", alignItems: "center", gap: 8, height: 48, padding: "0 18px 0 14px", borderRadius: 999, background: "rgba(255,255,255,0.94)", fontSize: 20, boxShadow: "0 0 0 1px #E0F2FE, 0 4px 10px rgba(47,74,95,0.12)" }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2F4A5F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {rotated ? (
          // 세로로 선 기기
          <rect x="7" y="3" width="10" height="18" rx="2" />
        ) : (
          // 가로로 누운 기기
          <rect x="3" y="7" width="18" height="10" rx="2" />
        )}
        <path d="M2 4a6 6 0 0 1 6-2" />
        <path d="M6 1l2 1-1 2" />
      </svg>
      {label}
    </button>
  );
}

export function WordbookPlayer({ character, exitHref, preview = false, offline = false, bookKey = "demo" }: Props) {
  const router = useRouter();
  const [rotated, toggleRotated] = useRotated();
  const scale = useStageScale(rotated);
  const [screen, setScreen] = useState<Screen>({ kind: "start" });
  const assetUrls = useMemo(
    () =>
      [...wordbookAssetUrls(), character.base, character.curious, character.surprised].filter(
        (url): url is string => Boolean(url),
      ),
    [character.base, character.curious, character.surprised],
  );
  const offlineStatus = useOfflineBook({ enabled: offline, bookKey, assetUrls });
  const install = useInstallPrompt();

  useEffect(() => {
    if (!offline) preloadWordbookAssets(assetUrls);
    return () => stopWordbookAudio();
  }, [offline, assetUrls]);

  function go(next: Screen) {
    stopWordbookAudio();
    setScreen(next);
  }

  function renderScreen() {
    switch (screen.kind) {
      case "start":
        return (
          <StartScreen
            character={character}
            offlineStatus={offline ? offlineStatus : null}
            onInstall={install}
            onStart={() => {
              unlockWordbookAudio();
              go({ kind: "home" });
            }}
          />
        );
      case "home":
        return (
          <HomeScreen
            character={character}
            onPickTopic={(topic) => go({ kind: "intro", topic, page: 0 })}
            onExit={() => router.push(exitHref)}
          />
        );
      case "intro": {
        const topic = getWordbookTopic(screen.topic);
        return (
          <IntroScreen
            key={`${screen.topic}-${screen.page}`}
            topic={topic}
            pageIndex={screen.page}
            character={character}
            onHome={() => go({ kind: "home" })}
            onPage={(page) => go({ kind: "intro", topic: screen.topic, page })}
            onGame={() => go({ kind: "game", topic: screen.topic, page: screen.page })}
          />
        );
      }
      case "game": {
        const topic = getWordbookTopic(screen.topic);
        const page = topic.pages[screen.page];
        const isLast = screen.page >= topic.pages.length - 1;
        const nav = {
          topic,
          pageIndex: screen.page,
          character,
          onHome: () => go({ kind: "home" }),
          onIntro: () => go({ kind: "intro", topic: screen.topic, page: screen.page }),
          // 탈것·동물 같은 규칙: 다음 쪽 소개로, 마지막 쪽이면 홈(다른 주제 고르기)
          onNext: () => go(isLast ? { kind: "home" } : { kind: "intro", topic: screen.topic, page: screen.page + 1 }),
        };
        const key = `${screen.topic}-${screen.page}`;
        return page.game.kind === "sound" ? (
          <SoundGameScreen key={key} game={page.game} {...nav} />
        ) : (
          <HintQuizScreen key={key} game={page.game} {...nav} />
        );
      }
    }
  }

  return (
    <div className={styles.root}>
      <div
        className={styles.stage}
        style={{ transform: `translate(-50%, -50%)${rotated ? " rotate(90deg)" : ""} scale(${scale})` }}
      >
        {renderScreen()}
        {/* 회전 버튼은 시작·홈 화면에만 (소개·게임 화면에서는 고른 방향을 그대로 쓴다) */}
        {screen.kind === "start" || screen.kind === "home" ? (
          <RotateButton rotated={rotated} onToggle={toggleRotated} />
        ) : null}
        {preview ? (
          <span style={{ position: "absolute", right: 16, bottom: 14, zIndex: 60, borderRadius: 999, background: "#F6E7C1", padding: "4px 12px", fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 600, color: "#8A5A12" }}>
            미리보기
          </span>
        ) : null}
      </div>
    </div>
  );
}
