"use client";

/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
import type { WordbookWord } from "@/lib/wordbook-content";
import { playPlaceholderSound, playSoundFile, stopWordbookAudio } from "./wordbook-audio";
import styles from "./wordbook.module.css";

export type WordbookCharacter = {
  /** 캐릭터 선택 때 저장된 이름 (시작 화면 "○○의") */
  name: string;
  base: string;
  curious: string | null;
  surprised: string | null;
};

export const COLORS = {
  ink: "#2F4A5F",
  sub: "#4A7896",
  coral: "#E07A5F",
  coralDark: "#C45C42",
  sky: "#38BDF8",
  skyDark: "#0EA5E9",
  line: "#E0F2FE",
  gold: "#E8C84A",
} as const;

export const softShadow = `0 0 0 1px ${COLORS.line}, 0 6px 16px rgba(47,74,95,0.10)`;

/** 단어 소리 재생: 녹음 파일이 있으면 파일, 없으면 임시 효과음 */
export function playWordSound(
  word: WordbookWord,
  options: { maxMs?: number; onEnd?: () => void } = {},
) {
  if (word.soundFile) {
    void playSoundFile(word.soundFile, { volume: word.volume, maxMs: options.maxMs, onEnd: options.onEnd });
    return;
  }
  stopWordbookAudio();
  let seed = 0;
  for (const ch of word.id) seed += ch.charCodeAt(0);
  playPlaceholderSound(seed);
  if (options.onEnd) window.setTimeout(options.onEnd, 550);
}

export function HomeIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={COLORS.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

export function ArrowIcon({ dir, color = COLORS.ink, size = 30 }: { dir: "left" | "right"; color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

export function GameIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="11" rx="5" />
      <path d="M7 11v3M5.5 12.5h3" />
      <circle cx="16" cy="12" r="1" />
      <circle cx="18" cy="14" r="1" />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLORS.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z" />
      <path d="M20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
    </svg>
  );
}

export function SpeakerIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

const STAR_PATH = "M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.1l1.5-7L2 9.3l7-.8z";

export function Star({ size, fill, stroke }: { size: number; fill: string; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR_PATH} fill={fill} stroke={stroke} strokeWidth={stroke ? 2 : undefined} />
    </svg>
  );
}

/** 위쪽 별 진행 표시 */
export function StarProgress({ total, solved, correct }: { total: number; solved: number; correct: boolean }) {
  return (
    <div
      role="img"
      aria-label={`${total}문제 중 ${Math.min(solved + 1, total)}번째`}
      style={{ display: "flex", gap: 10, borderRadius: 999, background: "#FFFFFF", padding: "12px 22px", boxShadow: `0 0 0 1px ${COLORS.line}` }}
    >
      {Array.from({ length: total }, (_, n) => {
        const got = n < solved || (correct && n === solved);
        const current = !got && n === solved;
        return (
          <Star
            key={n}
            size={36}
            fill={got ? COLORS.gold : current ? "#FFFFFF" : "#D7EBF6"}
            stroke={got ? COLORS.gold : current ? COLORS.coral : "#D7EBF6"}
          />
        );
      })}
    </div>
  );
}

export function CircleButton({
  label,
  onClick,
  disabled,
  size = 72,
  children,
  style,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  size?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#FFFFFF",
        boxShadow: disabled ? "none" : softShadow,
        opacity: disabled ? 0.45 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function PillButton({
  onClick,
  children,
  primary,
  style,
}: {
  onClick: () => void;
  children: ReactNode;
  primary?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 999,
        ...(primary
          ? { height: 76, padding: "0 36px", background: COLORS.coral, color: "#FFFFFF", fontSize: 34, boxShadow: `0 7px 0 ${COLORS.coralDark}` }
          : { height: 64, padding: "0 22px", background: "#FFFFFF", fontSize: 26, boxShadow: softShadow }),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** 흰 카드 안의 캐릭터 얼굴 (+ 오른쪽 위 ?/! 배지) */
export function CharacterCard({
  src,
  alt,
  size,
  radius,
  padding,
  badge,
  className,
}: {
  src: string;
  alt: string;
  size: number;
  radius: number;
  padding: number;
  badge?: "?" | "!";
  className?: string;
}) {
  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: radius,
          background: "#FFFFFF",
          padding,
          boxSizing: "border-box",
          boxShadow: `0 0 0 1px ${COLORS.line}, 0 16px 36px rgba(47,74,95,0.16)`,
        }}
      >
        <img src={src} alt={alt} draggable={false} style={{ width: "100%", height: "100%", borderRadius: radius - padding, objectFit: "cover" }} />
      </div>
      {badge ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -14,
            top: -14,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: badge === "!" ? "#FDE8E0" : "#F6E7C1",
            color: badge === "!" ? COLORS.coralDark : "#8A5A12",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            boxShadow: "0 4px 10px rgba(47,74,95,0.14)",
          }}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}

/** 흐린 배경 + 반투명 흰 막 */
export function SceneBackground({ src, blur = 2, veil = 0.38, saturate = 0.75 }: { src: string; blur?: number; veil?: number; saturate?: number }) {
  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ position: "absolute", inset: -8, width: "calc(100% + 16px)", height: "calc(100% + 16px)", objectFit: "cover", filter: `blur(${blur}px) saturate(${saturate})` }}
      />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: `rgba(255,255,255,${veil})` }} />
    </>
  );
}

/** 게임 완료 팝업 */
export function DoneOverlay({
  character,
  total,
  subText,
  nextLabel,
  onNext,
  onRestart,
}: {
  character: WordbookCharacter;
  total: number;
  subText: string;
  nextLabel: string;
  onNext: () => void;
  onRestart: () => void;
}) {
  return (
    <div className={styles.fadeIn} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(36,56,72,0.35)", zIndex: 40 }}>
      <div style={{ width: 620, borderRadius: 40, background: "#FFFFFF", padding: "40px 36px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, boxShadow: "0 24px 60px rgba(36,56,72,0.25)" }}>
        <div className={styles.pop} style={{ position: "relative", width: 150, height: 150 }}>
          <img
            src={character.surprised ?? character.base}
            alt="놀란 표정"
            draggable={false}
            style={{ width: "100%", height: "100%", borderRadius: 34, objectFit: "cover", boxShadow: "0 0 0 6px #FFF6F3" }}
          />
          <span aria-hidden="true" style={{ position: "absolute", right: -14, top: -14, width: 50, height: 50, borderRadius: "50%", background: "#FDE8E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: COLORS.coralDark }}>
            !
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {Array.from({ length: total }, (_, n) => (
            <Star key={n} size={44} fill={COLORS.gold} />
          ))}
        </div>
        <span style={{ fontSize: 44 }}>우와! 다 맞혔어요!</span>
        <span style={{ fontSize: 22, color: COLORS.sub }}>{subText}</span>
        <PillButton primary onClick={onNext} style={{ marginTop: 6, padding: "0 40px", fontSize: 32, gap: 10 }}>
          {nextLabel}
          <ArrowIcon dir="right" color="#FFFFFF" />
        </PillButton>
        <button type="button" onClick={onRestart} style={{ height: 44, fontSize: 20, color: COLORS.sub }}>
          한 번 더 하기
        </button>
      </div>
    </div>
  );
}

export function shuffle<T>(list: T[]) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
