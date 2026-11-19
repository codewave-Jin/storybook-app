"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import {
  countTopicWords,
  getWordbookWord,
  WORDBOOK_TOPICS,
  type WordbookTopic,
  type WordbookTopicId,
} from "@/lib/wordbook-content";
import {
  ArrowIcon,
  CharacterCard,
  CircleButton,
  COLORS,
  GameIcon,
  HomeIcon,
  PillButton,
  playWordSound,
  SceneBackground,
  type WordbookCharacter,
} from "./wordbook-ui";
import type { OfflineStatus } from "./wordbook-offline";
import styles from "./wordbook.module.css";

const LOGO = "/brand/panbagi-logo-full.png";

/* ------------------------------------------------------------------ */
/* 1. 시작 화면                                                         */
/* ------------------------------------------------------------------ */

function OfflineBadge({ status }: { status: OfflineStatus }) {
  let text: string;
  let tone: { bg: string; fg: string };
  if (status.state === "saving") {
    const pct = status.total ? Math.round((status.done / status.total) * 100) : 0;
    text = `인터넷 없이 보도록 저장하는 중 ${pct}%`;
    tone = { bg: "#FDF8EA", fg: "#8A5A12" };
  } else if (status.state === "saved") {
    text = status.failed ? "일부를 저장하지 못했어요 · 와이파이에서 다시 열어 주세요" : "✓ 인터넷 없이도 볼 수 있어요";
    tone = status.failed ? { bg: "#FDE8E0", fg: "#B4432A" } : { bg: "#E0F2FE", fg: "#0369A1" };
  } else if (status.state === "offline") {
    text = "처음 한 번은 인터넷에 연결해서 열어 주세요";
    tone = { bg: "#FDE8E0", fg: "#B4432A" };
  } else {
    return null;
  }
  return (
    <span style={{ borderRadius: 999, background: tone.bg, color: tone.fg, padding: "6px 16px", fontSize: 18, boxShadow: "0 0 0 1px rgba(47,74,95,0.08)" }}>
      {text}
    </span>
  );
}

export function StartScreen({
  character,
  onStart,
  offlineStatus,
  onInstall,
}: {
  character: WordbookCharacter;
  onStart: () => void;
  /** null 이면 저장 상태를 보여 주지 않는다 (미리보기) */
  offlineStatus: OfflineStatus | null;
  /** 안드로이드 크롬에서 바로 설치할 수 있을 때만 들어온다 */
  onInstall: (() => Promise<void>) | null;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#EAF4FB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
      <div aria-hidden="true" style={{ position: "absolute", left: -80, top: 40, width: 360, height: 360, borderRadius: "50%", background: "rgba(186,230,253,0.6)", filter: "blur(60px)" }} />
      <div aria-hidden="true" style={{ position: "absolute", right: -40, top: 0, width: 320, height: 320, borderRadius: "50%", background: "rgba(246,231,193,0.8)", filter: "blur(60px)" }} />
      <div aria-hidden="true" style={{ position: "absolute", right: 120, bottom: 60, width: 260, height: 260, borderRadius: "50%", background: "rgba(253,232,224,0.8)", filter: "blur(60px)" }} />
      <img src={LOGO} alt="판바기" draggable={false} style={{ position: "absolute", left: 40, top: 28, height: 60, width: "auto" }} />

      <p style={{ position: "relative", margin: 0, borderRadius: 999, background: "#FFFFFF", padding: "8px 22px", fontSize: 24, color: COLORS.skyDark, boxShadow: `0 0 0 1px ${COLORS.line}` }}>
        {character.name}의
      </p>
      <h1 style={{ position: "relative", margin: 0, fontSize: 84, fontWeight: 400, letterSpacing: "-0.01em" }}>단어 놀이 그림책</h1>
      <CharacterCard src={character.base} alt={`${character.name} 캐릭터`} size={250} radius={48} padding={10} />
      <button
        type="button"
        onClick={onStart}
        style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", height: 92, padding: "0 96px", borderRadius: 999, background: COLORS.coral, fontSize: 44, color: "#FFFFFF", boxShadow: `0 8px 0 ${COLORS.coralDark}` }}
      >
        시작하기
      </button>
      <p style={{ position: "relative", margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 20, color: COLORS.sub }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.sub} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9v6h4l5 4V5L8 9z" />
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
        </svg>
        소리를 켜고 시작해요
      </p>
      <div style={{ position: "absolute", right: 32, top: 32, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {offlineStatus ? <OfflineBadge status={offlineStatus} /> : null}
        {onInstall ? (
          <button
            type="button"
            onClick={() => void onInstall()}
            style={{ borderRadius: 999, background: "#FFFFFF", padding: "8px 18px", fontSize: 20, boxShadow: `0 0 0 1px ${COLORS.line}, 0 4px 10px rgba(47,74,95,0.10)` }}
          >
            다운로드
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. 홈 (주제 고르기)                                                   */
/* ------------------------------------------------------------------ */

function TopicCover({ topic }: { topic: WordbookTopic }) {
  if (topic.coverWord) {
    return <img src={getWordbookWord(topic.coverWord).image} alt="" draggable={false} style={{ width: 128, height: 128, objectFit: "contain" }} />;
  }
  if (topic.id === "color") {
    return (
      <svg width="112" height="112" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="40" cy="44" r="22" fill="#E03131" />
        <circle cx="80" cy="44" r="22" fill="#FFC107" />
        <circle cx="40" cy="84" r="22" fill="#1C7ED6" />
        <circle cx="80" cy="84" r="22" fill="#37B24D" />
      </svg>
    );
  }
  return <span style={{ fontSize: 64 }}>🍎</span>;
}

export function HomeScreen({
  character,
  onPickTopic,
  onExit,
}: {
  character: WordbookCharacter;
  onPickTopic: (topic: WordbookTopicId) => void;
  onExit: () => void;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#EAF4FB", padding: "40px 56px 80px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 36 }}>
      <div aria-hidden="true" style={{ position: "absolute", right: -60, top: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(246,231,193,0.7)", filter: "blur(60px)" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <CharacterCard src={character.base} alt={`${character.name} 캐릭터`} size={132} radius={34} padding={6} />
          <div style={{ borderRadius: 28, background: "#FFFFFF", padding: "20px 34px", fontSize: 44, boxShadow: `0 0 0 1px ${COLORS.line}, 0 6px 16px rgba(47,74,95,0.08)` }}>무엇을 배워볼까?</div>
        </div>
        <div style={{ alignSelf: "flex-start", marginTop: -14, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <img src={LOGO} alt="판바기" draggable={false} style={{ height: 80, width: "auto" }} />
          <button
            type="button"
            onClick={onExit}
            style={{ display: "flex", alignItems: "center", gap: 8, height: 56, padding: "0 24px", borderRadius: 999, background: "#FFFFFF", fontSize: 26, color: COLORS.ink, boxShadow: `0 0 0 2px ${COLORS.line}, 0 5px 0 #D7EBF6` }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 4H5v16h5" />
              <path d="M14 8l4 4-4 4" />
              <path d="M18 12H9" />
            </svg>
            나가기
          </button>
        </div>
      </div>

      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 24, flexGrow: 1 }}>
        {WORDBOOK_TOPICS.map((topic) => {
          const disabled = !topic.enabled;
          return (
            <button
              key={topic.id}
              type="button"
              disabled={disabled}
              aria-label={disabled ? `${topic.title} · 준비 중` : topic.title}
              onClick={() => onPickTopic(topic.id)}
              style={{
                borderRadius: 36,
                background: disabled ? "#F4F7FA" : "#FFFFFF",
                boxShadow: disabled ? "0 0 0 2px #D7E1EA" : `0 0 0 2px ${topic.tone.ring}, 0 10px 0 ${topic.tone.shadow}`,
                opacity: disabled ? 0.55 : 1,
                filter: disabled ? "grayscale(1)" : undefined,
                cursor: disabled ? "not-allowed" : "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
              }}
            >
              <span style={{ width: 168, height: 168, borderRadius: "50%", background: topic.tone.circle, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TopicCover topic={topic} />
              </span>
              <span style={{ fontSize: 52, color: COLORS.ink }}>{topic.title}</span>
              <span
                style={{
                  borderRadius: 999,
                  background: disabled ? "#E2E8EE" : topic.tone.pill,
                  padding: "6px 16px",
                  fontSize: 20,
                  color: disabled ? "#4A5A68" : topic.tone.pillText,
                }}
              >
                {disabled ? "준비 중" : `단어 ${countTopicWords(topic)}개`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. 소개 페이지                                                        */
/* ------------------------------------------------------------------ */

export function IntroScreen({
  topic,
  pageIndex,
  character,
  onHome,
  onPage,
  onGame,
}: {
  topic: WordbookTopic;
  pageIndex: number;
  character: WordbookCharacter;
  onHome: () => void;
  onPage: (pageIndex: number) => void;
  onGame: () => void;
}) {
  const page = topic.pages[pageIndex];
  const [active, setActive] = useState<{ id: string; tick: number } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setActive(null);
  }, [pageIndex]);

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    [],
  );

  function tap(wordId: string) {
    playWordSound(getWordbookWord(wordId));
    setActive((current) => ({ id: wordId, tick: (current?.tick ?? 0) + 1 }));
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(null), 1600);
  }

  const lastPage = topic.pages.length - 1;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <SceneBackground src={page.background} />

      {/* 위쪽: 홈 · 주제 이름 + 쪽 표시 */}
      <div style={{ position: "absolute", left: 32, top: 28, right: 32, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 30 }}>
        <CircleButton label="홈으로" onClick={onHome}>
          <HomeIcon />
        </CircleButton>
        <div style={{ display: "flex", alignItems: "center", gap: 16, borderRadius: 999, background: "#FFFFFF", padding: "10px 24px", boxShadow: `0 0 0 1px ${COLORS.line}` }}>
          <span style={{ fontSize: 34 }}>{topic.title}</span>
          <span style={{ display: "flex", gap: 8 }} aria-label={`${topic.pages.length}쪽 중 ${pageIndex + 1}쪽`}>
            {topic.pages.map((_, n) => (
              <span key={n} style={{ width: n === pageIndex ? 26 : 10, height: 10, borderRadius: 5, background: n === pageIndex ? COLORS.coral : "#C0DCEC" }} />
            ))}
          </span>
        </div>
        <span style={{ width: 72, height: 72 }} />
      </div>

      {/* 가운데 주인공 */}
      <div style={{ position: "absolute", left: 477, top: 482 }}>
        <CharacterCard className={styles.sway} src={character.base} alt={`${character.name} 기본 표정`} size={240} radius={48} padding={10} />
      </div>

      {/* 단어 그림들 */}
      {page.words.map((placement) => {
        const word = getWordbookWord(placement.word);
        const isActive = active?.id === word.id;
        return (
          <div key={word.id} style={{ position: "absolute", left: placement.x, top: placement.y, width: placement.w, height: placement.h, zIndex: isActive ? 20 : 10 }}>
            {isActive ? (
              <span
                className={styles.bubble}
                style={{ position: "absolute", left: "50%", bottom: "100%", marginBottom: 8, zIndex: 5, whiteSpace: "nowrap", borderRadius: 22, background: "#FFFFFF", padding: "8px 18px", fontSize: 28, boxShadow: "0 0 0 2px rgba(224,122,95,0.45), 0 6px 16px rgba(47,74,95,0.15)" }}
              >
                {word.sound} {word.label}
              </span>
            ) : null}
            <button
              key={isActive ? `on-${active?.tick}` : "off"}
              type="button"
              aria-label={word.label}
              onClick={() => tap(word.id)}
              className={isActive ? styles.wiggle : undefined}
              style={{ display: "block", width: "100%", height: "100%" }}
            >
              <img src={word.image} alt="" draggable={false} className={styles.sticker} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </button>
            <span style={{ position: "absolute", left: "50%", top: "100%", marginTop: 2, transform: "translateX(-50%)", whiteSpace: "nowrap", borderRadius: 999, background: "#FFFFFF", padding: "2px 16px", fontSize: 26, boxShadow: `0 0 0 1px ${COLORS.line}`, pointerEvents: "none" }}>
              {word.label}
            </span>
          </div>
        );
      })}

      {/* 이전 · 다음 페이지 (첫 쪽 왼쪽은 꺼 두고, 마지막 쪽 오른쪽은 홈으로) */}
      <CircleButton label="이전 페이지" size={68} disabled={pageIndex === 0} onClick={() => onPage(pageIndex - 1)} style={{ position: "absolute", left: 28, top: 380, zIndex: 30 }}>
        <ArrowIcon dir="left" />
      </CircleButton>
      <div style={{ position: "absolute", right: 28, top: 380, zIndex: 30 }}>
        {pageIndex === lastPage ? (
          <span
            aria-hidden="true"
            className={styles.hintBubble}
            style={{ position: "absolute", right: -6, bottom: "100%", marginBottom: 16, borderRadius: 22, background: "#FFFFFF", padding: "8px 16px", fontSize: 24, lineHeight: 1.25, textAlign: "center", whiteSpace: "nowrap", boxShadow: "0 0 0 2px rgba(224,122,95,0.45), 0 6px 16px rgba(47,74,95,0.15)" }}
          >
            다른 것도
            <br />
            배워보기
            <span style={{ position: "absolute", right: 34, top: "100%", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "12px solid #FFFFFF" }} />
          </span>
        ) : null}
        <CircleButton
          label={pageIndex === lastPage ? "다른 것도 배워보기" : "다음 페이지"}
          size={68}
          onClick={() => (pageIndex === lastPage ? onHome() : onPage(pageIndex + 1))}
        >
          <ArrowIcon dir="right" />
        </CircleButton>
      </div>

      <PillButton primary onClick={onGame} style={{ position: "absolute", left: "50%", top: 736, transform: "translateX(-50%)", zIndex: 30 }}>
        <GameIcon />
        게임하기
      </PillButton>
    </div>
  );
}
