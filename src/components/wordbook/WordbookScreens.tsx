"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import {
  countTopicWords,
  getWordbookWord,
  talkLine,
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
/** 시작 화면 표지 그림 */
const COVER = "/wordbook/scenes/cover.jpg";
/** 홈 화면 배경 (표지와 같은 그림에서 제목만 지운 것) */
const HOME_BG = "/wordbook/scenes/home.jpg";

/** 시작 화면 반짝이 (노란 짧은 선 3개) */
function Sparkle({ x, y, flip }: { x: number; y: number; flip?: boolean }) {
  return (
    <svg aria-hidden="true" width="56" height="56" viewBox="0 0 56 56" style={{ position: "absolute", left: x, top: y, transform: flip ? "scaleX(-1)" : undefined }}>
      <path d="M10 46 L22 34 M6 24 L22 26 M26 6 L28 22" stroke="#F5C518" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

/** 단어를 누르고 캐릭터가 말하기까지, 말풍선이 떠 있는 시간 */
const TALK_DELAY_MS = 500;
const TALK_SHOW_MS = 2400;

/* ------------------------------------------------------------------ */
/* 1. 시작 화면                                                         */
/* ------------------------------------------------------------------ */

function OfflineBadge({ status }: { status: OfflineStatus }) {
  let text: string;
  let tone: { bg: string; fg: string };
  if (status.state === "saving") {
    const pct = status.total ? Math.round((status.done / status.total) * 100) : 0;
    text = `인터넷 없이 보도록 저장하는 중 ${pct}%`;
    tone = { bg: "rgba(253,248,234,0.95)", fg: "#8A5A12" };
  } else if (status.state === "saved") {
    text = status.failed ? "일부를 저장하지 못했어요 · 와이파이에서 다시 열어 주세요" : "✓ 인터넷 없이도 볼 수 있어요";
    tone = status.failed ? { bg: "rgba(253,232,224,0.95)", fg: "#B4432A" } : { bg: "rgba(255,255,255,0.92)", fg: "#1E5AA8" };
  } else if (status.state === "offline") {
    text = "처음 한 번은 인터넷에 연결해서 열어 주세요";
    tone = { bg: "#FDE8E0", fg: "#B4432A" };
  } else {
    return null;
  }
  return (
    <span style={{ borderRadius: 999, background: tone.bg, color: tone.fg, padding: "8px 18px", fontSize: 20, boxShadow: "0 4px 12px rgba(47,74,95,0.12)" }}>
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
    <div style={{ position: "absolute", inset: 0, background: "#CFE8F7" }}>
      {/* 표지 그림 ("단어 놀이 그림책" 제목은 그림 안에 들어 있다) */}
      <img src={COVER} alt="단어 놀이 그림책" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", left: 20, top: 16, borderRadius: 28, background: "#FFFFFF", padding: "10px 20px", boxShadow: "0 0 0 3px rgba(255,255,255,0.6), 0 8px 20px rgba(47,74,95,0.22)" }}>
        <img src={LOGO} alt="판바기" draggable={false} style={{ display: "block", height: 84, width: "auto" }} />
      </div>

      <Sparkle x={452} y={70} />
      <div style={{ position: "absolute", left: "50%", top: 86, transform: "translateX(-50%)", borderRadius: 999, background: "rgba(255,255,255,0.94)", padding: "6px 34px", fontSize: 40, color: "#1E5AA8", border: "3px dashed #9CC9E8", boxShadow: "0 6px 16px rgba(47,74,95,0.12)", whiteSpace: "nowrap" }}>
        {character.name}의
      </div>

      <div style={{ position: "absolute", left: 466, top: 276 }}>
        <CharacterCard src={character.base} alt={`${character.name} 캐릭터`} size={262} radius={52} padding={12} />
      </div>
      <Sparkle x={730} y={270} flip />

      <button
        type="button"
        onClick={onStart}
        style={{ position: "absolute", left: "50%", top: 558, transform: "translateX(-50%)", display: "flex", alignItems: "center", justifyContent: "center", gap: 18, width: 384, height: 100, borderRadius: 999, background: "linear-gradient(180deg, #F2876B 0%, #E0603F 100%)", fontSize: 52, color: "#FFFFFF", boxShadow: "0 8px 0 #C4503A, 0 16px 30px rgba(196,80,58,0.3)" }}
      >
        <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z" fill="#FFFFFF" />
        </svg>
        시작하기
      </button>
      <Sparkle x={780} y={532} flip />

      <p style={{ position: "absolute", left: "50%", top: 682, transform: "translateX(-50%)", margin: 0, display: "flex", alignItems: "center", gap: 10, borderRadius: 999, background: "rgba(255,255,255,0.9)", padding: "8px 24px", fontSize: 24, boxShadow: "0 4px 12px rgba(47,74,95,0.12)", whiteSpace: "nowrap" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E5AA8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9v6h4l5 4V5L8 9z" />
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
        </svg>
        소리를 켜고 시작해요
      </p>

      <div style={{ position: "absolute", right: 24, top: 24, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {offlineStatus ? <OfflineBadge status={offlineStatus} /> : null}
        {onInstall ? (
          <button
            type="button"
            onClick={() => void onInstall()}
            style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 999, background: "#FFFFFF", padding: "8px 20px", fontSize: 22, boxShadow: `0 0 0 1px ${COLORS.line}, 0 4px 12px rgba(47,74,95,0.12)` }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11M8 11l4 4 4-4M5 20h14" />
            </svg>
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
  return <span style={{ fontSize: 18, color: "#9AA8B4" }}>사과 그림</span>;
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
    <div style={{ position: "absolute", inset: 0, background: "#CFE8F7", padding: "40px 56px 80px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 36 }}>
      <img src={HOME_BG} alt="" aria-hidden="true" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <CharacterCard src={character.base} alt={`${character.name} 캐릭터`} size={132} radius={34} padding={6} />
          <div style={{ borderRadius: 28, background: "#FFFFFF", padding: "20px 34px", fontSize: 44, boxShadow: `0 0 0 1px ${COLORS.line}, 0 8px 20px rgba(47,74,95,0.18)` }}>무엇을 배워볼까?</div>
        </div>
        <div style={{ alignSelf: "flex-start", marginTop: -14, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <div style={{ borderRadius: 28, background: "#FFFFFF", padding: "10px 20px", boxShadow: "0 0 0 3px rgba(255,255,255,0.6), 0 8px 20px rgba(47,74,95,0.22)" }}>
          <img src={LOGO} alt="판바기" draggable={false} style={{ display: "block", height: 84, width: "auto" }} />
        </div>
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
                boxShadow: disabled ? "0 0 0 2px #D7E1EA, 0 10px 0 #E2E8EE" : `0 0 0 2px ${topic.tone.ring}, 0 10px 0 ${topic.tone.shadow}`,
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
                <span style={{ display: "flex", opacity: disabled ? 0.45 : 1 }}>
                  <TopicCover topic={topic} />
                </span>
              </span>
              <span style={{ fontSize: 52, color: disabled ? "#9AA8B4" : COLORS.ink }}>{topic.title}</span>
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
  // 가운데 캐릭터가 하는 말 (단어를 누르고 잠깐 뒤에 나온다)
  const [talk, setTalk] = useState<{ id: string; tick: number } | null>(null);
  const timer = useRef<number | null>(null);
  const talkTimers = useRef<number[]>([]);

  useEffect(() => {
    setActive(null);
    setTalk(null);
  }, [pageIndex]);

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
      talkTimers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  function tap(wordId: string) {
    playWordSound(getWordbookWord(wordId));
    setActive((current) => ({ id: wordId, tick: (current?.tick ?? 0) + 1 }));
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(null), 1600);

    talkTimers.current.forEach((id) => window.clearTimeout(id));
    talkTimers.current = [
      window.setTimeout(() => setTalk((current) => ({ id: wordId, tick: (current?.tick ?? 0) + 1 })), TALK_DELAY_MS),
      window.setTimeout(() => setTalk(null), TALK_DELAY_MS + TALK_SHOW_MS),
    ];
  }

  const talkWord = talk ? getWordbookWord(talk.id) : null;

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
      <div style={{ position: "absolute", left: 477, top: 482, zIndex: 15 }}>
        {talkWord ? (
          <div
            key={`talk-${talk?.tick}`}
            className={styles.talk}
            style={{ position: "absolute", left: "50%", bottom: "100%", marginBottom: 18, zIndex: 40, width: "max-content", maxWidth: 440, borderRadius: 28, background: "#FFFFFF", padding: "14px 26px", fontSize: 32, lineHeight: 1.25, textAlign: "center", boxShadow: `0 0 0 3px ${COLORS.sky}, 0 10px 24px rgba(47,74,95,0.18)` }}
          >
            {talkLine(talkWord, character.name)}
            <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "100%", marginLeft: -12, marginTop: -9, width: 24, height: 24, background: "#FFFFFF", transform: "rotate(45deg)", boxShadow: `3px 3px 0 0 ${COLORS.sky}` }} />
          </div>
        ) : null}
        <CharacterCard
          key={talkWord ? `hop-${talk?.tick}` : "idle"}
          className={talkWord ? styles.hop : styles.sway}
          src={(talkWord ? character.surprised : null) ?? character.base}
          alt={talkWord ? `${character.name} 놀란 표정` : `${character.name} 기본 표정`}
          size={240}
          radius={48}
          padding={10}
          badge={talkWord ? "!" : undefined}
        />
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
