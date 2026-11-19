"use client";

/**
 * 단어 그림책 소리.
 * - 녹음 파일은 HTMLAudioElement 하나를 계속 다시 쓴다. 아이패드(Safari)는
 *   사용자가 한 번 눌러서 재생한 오디오 요소만 이후에도 자유롭게 재생해 주기 때문이다.
 *   그래서 "시작하기"를 누를 때 unlock() 을 먼저 불러 둔다.
 * - 효과음(정답·오답·임시 동물 소리)은 WebAudio 로 만든다.
 * - 이름 읽기는 기기 음성(ko-KR). 나중에 녹음 파일로 바꿀 수 있게 speak() 한 곳에 모았다.
 */

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

type PlayOptions = {
  volume?: number;
  /** 이 시간이 지나면 서서히 줄이고 멈춘다 (ms) */
  maxMs?: number;
  onEnd?: () => void;
};

let audioEl: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let playToken = 0;
let fadeTimer: number | null = null;
let fadeInterval: number | null = null;

function getAudioEl() {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "auto";
  }
  return audioEl;
}

function getCtx() {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function clearFade() {
  if (fadeTimer != null) window.clearTimeout(fadeTimer);
  if (fadeInterval != null) window.clearInterval(fadeInterval);
  fadeTimer = null;
  fadeInterval = null;
}

/** 첫 터치 때 한 번 불러 두면 이후 타이머 안에서도 소리가 난다 */
export function unlockWordbookAudio() {
  getCtx();
  const el = getAudioEl();
  if (!el) return;
  el.src = SILENT_WAV;
  void el.play().catch(() => undefined);
}

export function stopWordbookAudio() {
  playToken += 1;
  clearFade();
  audioEl?.pause();
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/** 녹음 파일 재생. 실패하면 false 를 돌려주고 onEnd 를 바로 부른다 */
export function playSoundFile(src: string, options: PlayOptions = {}) {
  const el = getAudioEl();
  stopWordbookAudio();
  const token = playToken;
  if (!el) {
    options.onEnd?.();
    return Promise.resolve(false);
  }
  const volume = options.volume ?? 1;
  let finished = false;
  const finish = () => {
    if (finished || token !== playToken) return;
    finished = true;
    clearFade();
    options.onEnd?.();
  };

  el.onended = finish;
  el.onerror = finish;
  el.volume = volume;
  el.src = src;
  el.currentTime = 0;

  if (options.maxMs) {
    fadeTimer = window.setTimeout(() => {
      if (token !== playToken) return;
      let v = el.volume;
      fadeInterval = window.setInterval(() => {
        v -= 0.1;
        if (v <= 0) {
          el.pause();
          finish();
        } else {
          el.volume = v;
        }
      }, 30);
    }, options.maxMs);
  }

  return el
    .play()
    .then(() => true)
    .catch(() => {
      finish();
      return false;
    });
}

function tone(f1: number, f2: number, start: number, dur: number, type: OscillatorType, vol: number) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    // 소리가 안 나도 게임은 계속된다
  }
}

/** 소리 파일이 아직 없는 단어용 임시 효과음 (단어마다 음 높이만 다름) · 약 0.45초 */
export function playPlaceholderSound(seed: number) {
  const base = [330, 440, 262, 392, 523][Math.abs(seed) % 5];
  tone(base, base * 1.6, 0, 0.22, "triangle", 0.35);
  tone(base * 1.5, base * 0.9, 0.16, 0.25, "sine", 0.3);
}

/** 정답 효과음: 도-미-솔-도 · 약 0.7초 */
export function playSuccessSound() {
  [523, 659, 784].forEach((f, k) => tone(f, f, k * 0.1, 0.16, "triangle", 0.3));
  tone(1047, 1047, 0.3, 0.4, "triangle", 0.32);
  tone(1568, 1568, 0.3, 0.35, "sine", 0.12);
}

/** 오답 효과음: 뿌-우- 내려가는 두 음 · 약 0.55초 */
export function playFailSound() {
  tone(392, 349, 0, 0.22, "square", 0.12);
  tone(330, 247, 0.22, 0.32, "square", 0.12);
}

/** 단어 이름 읽기 (기기 음성) */
export function speakWord(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.85;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  } catch {
    // 음성이 없는 기기
  }
}

/** 그림·소리를 미리 받아 둔다 (화면 전환 때 끊기지 않게) */
export function preloadWordbookAssets(urls: string[]) {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (/\.(m4a|mp3|wav)$/i.test(url)) {
      void fetch(url).catch(() => undefined);
    } else {
      const img = new Image();
      img.src = url;
    }
  }
}
