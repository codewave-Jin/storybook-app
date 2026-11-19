"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getWordbookWord,
  withSubjectParticle,
  type WordbookHintGame,
  type WordbookSoundGame,
  type WordbookTopic,
} from "@/lib/wordbook-content";
import { playFailSound, playSuccessSound, speakWord, stopWordbookAudio } from "./wordbook-audio";
import {
  BookIcon,
  CharacterCard,
  CircleButton,
  COLORS,
  DoneOverlay,
  HomeIcon,
  PillButton,
  playWordSound,
  SceneBackground,
  shuffle,
  SpeakerIcon,
  StarProgress,
  type WordbookCharacter,
} from "./wordbook-ui";
import styles from "./wordbook.module.css";

/** 맞힌 뒤 다음 문제로 넘어가기까지 (동물 소리가 끊기지 않게 소리 게임은 조금 더 길게) */
const NEXT_DELAY = { sound: 3000, hint: 2000 } as const;
/** 정답 효과음 뒤에 단어 소리가 나오기까지 */
const ANSWER_SOUND_DELAY = 750;
/** 게임에서 녹음 소리는 최대 3초만 */
const GAME_SOUND_MAX_MS = 3000;

type GameNav = {
  topic: WordbookTopic;
  pageIndex: number;
  character: WordbookCharacter;
  onHome: () => void;
  onIntro: () => void;
  /** 다 맞힌 뒤 "다음" 버튼: 다음 쪽 소개 페이지 또는 홈 */
  onNext: () => void;
};

type Phase = "ask" | "correct";

type RoundState = {
  order: string[];
  index: number;
  choices: string[];
  phase: Phase;
  wrong: string | null;
  wrongTick: number;
  done: boolean;
};

/** 두 게임이 같이 쓰는 진행 로직 */
function useQuizRounds(
  questionIds: string[],
  makeChoices: (answer: string) => string[],
  nextDelay: number,
) {
  const init = useCallback((): RoundState => {
    const order = shuffle(questionIds);
    return { order, index: 0, choices: makeChoices(order[0]), phase: "ask", wrong: null, wrongTick: 0, done: false };
  }, [questionIds, makeChoices]);

  const [state, setState] = useState<RoundState>(init);
  const stateRef = useRef(state);
  stateRef.current = state;
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      stopWordbookAudio();
    },
    [],
  );

  const answer = state.order[Math.min(state.index, state.order.length - 1)];

  const pick = useCallback(
    (wordId: string) => {
      if (state.phase !== "ask" || state.done) return;
      if (wordId === answer) {
        playSuccessSound();
        later(() => playWordSound(getWordbookWord(wordId), { maxMs: GAME_SOUND_MAX_MS }), ANSWER_SOUND_DELAY);
        setState((s) => ({ ...s, phase: "correct", wrong: null }));
        later(() => {
          const s = stateRef.current;
          const next = s.index + 1;
          if (next >= s.order.length) {
            setState({ ...s, done: true, index: s.order.length });
            return;
          }
          const nextWord = s.order[next];
          // 다음 문제 소리는 자동으로 내지 않는다 (실루엣을 눌러야 나온다)
          setState({ ...s, index: next, choices: makeChoices(nextWord), phase: "ask", wrong: null });
        }, nextDelay);
      } else {
        // 틀리면 오답 효과음만 (동물 소리는 내지 않는다)
        playFailSound();
        setState((s) => ({ ...s, wrong: wordId, wrongTick: s.wrongTick + 1 }));
        later(() => setState((s) => (s.wrong === wordId ? { ...s, wrong: null } : s)), 700);
      }
    },
    [answer, later, makeChoices, nextDelay, state.done, state.phase],
  );

  const replay = useCallback(() => {
    const word = getWordbookWord(answer);
    playWordSound(word, { maxMs: GAME_SOUND_MAX_MS, onEnd: () => speakWord(word.label) });
  }, [answer]);

  const restart = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    stopWordbookAudio();
    setState(init());
  }, [init]);

  return { state, answer, pick, replay, restart };
}

function GameTopBar({ topic, total, solved, correct, onHome, onIntro }: { topic: WordbookTopic; total: number; solved: number; correct: boolean; onHome: () => void; onIntro: () => void }) {
  return (
    <div style={{ position: "absolute", left: 32, top: 28, right: 32, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 30 }}>
      <CircleButton label="홈으로" onClick={onHome}>
        <HomeIcon />
      </CircleButton>
      <StarProgress total={total} solved={solved} correct={correct} />
      <PillButton onClick={onIntro} style={{ gap: 8 }}>
        <BookIcon />
        {topic.title} 보러 가기
      </PillButton>
    </div>
  );
}

function ChoiceCard({
  wordId,
  isAnswer,
  isWrong,
  dimmed,
  width,
  height,
  imgW,
  imgH,
  fontSize,
  radius,
  onPick,
}: {
  wordId: string;
  isAnswer: boolean;
  isWrong: boolean;
  dimmed: boolean;
  width: number;
  height: number;
  imgW: number;
  imgH: number;
  fontSize: number;
  radius: number;
  onPick: () => void;
}) {
  const word = getWordbookWord(wordId);
  return (
    <button
      type="button"
      aria-label={word.label}
      onClick={onPick}
      className={isWrong ? styles.shake : isAnswer ? styles.pop : undefined}
      style={{
        width,
        height,
        borderRadius: radius,
        background: isAnswer ? "#FFF6F3" : "#FFFFFF",
        boxShadow: isAnswer
          ? "0 0 0 5px #E07A5F, 0 8px 0 #F2C3B5"
          : isWrong
            ? "0 0 0 3px #C0DCEC, 0 8px 0 #D7EBF6"
            : "0 0 0 2px rgba(232,200,74,0.45), 0 8px 0 #F6E7C1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      <img src={word.image} alt="" draggable={false} style={{ width: imgW, height: imgH, objectFit: "contain" }} />
      <span style={{ fontSize }}>{word.label}</span>
    </button>
  );
}

function nextLabelFor(topic: WordbookTopic, pageIndex: number) {
  return pageIndex < topic.pages.length - 1 ? `${topic.title} ${pageIndex + 2} 보러 가기` : "다른 주제 고르기";
}

function finishTextFor(topic: WordbookTopic, pageIndex: number) {
  return pageIndex < topic.pages.length - 1 ? `이제 다른 ${topic.title} 친구들을 만나러 가요` : topic.finishText;
}

/* ------------------------------------------------------------------ */
/* 동물: 누구 소리일까? (실루엣 소리 듣고 고르기)                           */
/* ------------------------------------------------------------------ */

export function SoundGameScreen({ game, ...nav }: GameNav & { game: WordbookSoundGame }) {
  const { topic, pageIndex, character } = nav;
  const makeChoices = useCallback(
    (answer: string) => shuffle([answer, ...shuffle(game.words.filter((id) => id !== answer)).slice(0, 2)]),
    [game.words],
  );
  const { state, answer, pick, replay, restart } = useQuizRounds(game.words, makeChoices, NEXT_DELAY.sound);
  const q = getWordbookWord(answer);
  const correct = state.phase === "correct";
  const wrongWord = state.wrong ? getWordbookWord(state.wrong) : null;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <SceneBackground src={topic.pages[pageIndex].background} blur={3} veil={0.5} saturate={0.7} />
      <GameTopBar topic={topic} total={state.order.length} solved={state.index} correct={correct} onHome={nav.onHome} onIntro={nav.onIntro} />

      <div style={{ position: "absolute", left: 90, top: 150, width: 220, display: "flex", justifyContent: "center" }}>
        <CharacterCard
          className={correct ? styles.pop : styles.swayGame}
          src={(correct ? character.surprised : character.curious) ?? character.base}
          alt={correct ? "놀란 표정" : "궁금한 표정"}
          size={200}
          radius={44}
          padding={9}
          badge={correct ? "!" : "?"}
        />
      </div>

      <div style={{ position: "absolute", left: 377, top: 120, width: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 46, textShadow: "0 2px 0 #FFFFFF" }}>
          {correct ? `딩동댕! ${q.label}!` : wrongWord ? "다시 들어볼까?" : "누구 소리일까?"}
        </span>
        <button
          type="button"
          aria-label="소리 다시 듣기"
          onClick={replay}
          className={correct ? styles.pop : styles.pulse}
          style={{ position: "relative", width: 280, height: 280, borderRadius: "50%", border: `6px dashed ${correct ? COLORS.gold : "#7DD3FC"}`, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 30, boxSizing: "border-box" }}
        >
          <img src={q.image} alt="" draggable={false} className={correct ? styles.revealed : styles.silhouette} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          <span style={{ position: "absolute", right: -2, bottom: 10, width: 72, height: 72, borderRadius: "50%", background: COLORS.sky, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 5px 0 ${COLORS.skyDark}` }}>
            <SpeakerIcon />
          </span>
        </button>
        <span style={{ fontSize: 22, color: COLORS.sub, textShadow: "0 1px 0 #FFFFFF" }}>
          {correct ? "잘했어요! 다음 문제로 가요" : wrongWord ? `앗, ${withSubjectParticle(wrongWord.label)} 아니었어요` : "그림자를 누르면 소리가 다시 나와요"}
        </span>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 572, display: "flex", justifyContent: "center", gap: 28 }}>
        {state.choices.map((id) => (
          <ChoiceCard
            key={`${state.index}-${id}-${state.wrong === id ? state.wrongTick : 0}`}
            wordId={id}
            isAnswer={correct && id === answer}
            isWrong={state.wrong === id}
            dimmed={correct && id !== answer}
            width={240}
            height={210}
            imgW={170}
            imgH={130}
            fontSize={32}
            radius={34}
            onPick={() => pick(id)}
          />
        ))}
      </div>

      {state.done ? (
        <DoneOverlay
          character={character}
          total={state.order.length}
          subText={finishTextFor(topic, pageIndex)}
          nextLabel={nextLabelFor(topic, pageIndex)}
          onNext={nav.onNext}
          onRestart={restart}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 탈것: 힌트 그림·글자·실루엣 보고 고르기                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_SILHOUETTE = { right: 36, bottom: 18, width: 380, height: 290 };

export function HintQuizScreen({ game, ...nav }: GameNav & { game: WordbookHintGame }) {
  const { topic, pageIndex, character } = nav;
  const questionIds = useRef(game.questions.map((question) => question.word)).current;
  const makeChoices = useCallback(
    (answer: string) => game.questions.find((question) => question.word === answer)?.choices.slice() ?? [],
    [game.questions],
  );
  const { state, answer, pick, replay, restart } = useQuizRounds(questionIds, makeChoices, NEXT_DELAY.hint);
  const question = game.questions.find((item) => item.word === answer) ?? game.questions[0];
  const q = getWordbookWord(answer);
  const correct = state.phase === "correct";
  const wrongWord = state.wrong ? getWordbookWord(state.wrong) : null;
  const sil = question.silhouette ?? DEFAULT_SILHOUETTE;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <SceneBackground src={topic.gameBackground ?? topic.pages[pageIndex].background} blur={3} veil={0.5} saturate={0.7} />
      <GameTopBar topic={topic} total={state.order.length} solved={state.index} correct={correct} onHome={nav.onHome} onIntro={nav.onIntro} />

      {/* 왼쪽 주인공 (힌트 박스 세로 가운데) */}
      <div style={{ position: "absolute", left: 24, top: 222, width: 280, display: "flex", justifyContent: "center" }}>
        <CharacterCard
          className={correct ? styles.pop : styles.swayGame}
          src={(correct ? character.surprised : character.curious) ?? character.base}
          alt={correct ? "놀란 표정" : "궁금한 표정"}
          size={240}
          radius={52}
          padding={11}
          badge={correct ? "!" : "?"}
        />
      </div>

      {/* 힌트 박스: 힌트 그림 + 글자 + 정답 실루엣 */}
      <div style={{ position: "absolute", left: 328, top: 112, width: 858, height: 504, borderRadius: 28, overflow: "hidden", background: "#B6B0A7", boxShadow: "0 0 0 6px #FFFFFF, 0 16px 36px rgba(47,74,95,0.18)" }}>
        <img src={question.hintImage} alt="" aria-hidden="true" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", left: 20, right: 20, top: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ maxWidth: "100%", textAlign: "center", borderRadius: 28, background: "rgba(255,255,255,0.92)", padding: "8px 30px", fontSize: 36, lineHeight: 1.3, boxShadow: "0 6px 16px rgba(47,74,95,0.12)" }}>
            {correct ? `딩동댕! ${q.label}!` : wrongWord ? "다시 들어볼까?" : question.clue}
          </span>
          <span style={{ borderRadius: 999, background: "rgba(255,255,255,0.85)", padding: "4px 18px", fontSize: 20, color: COLORS.sub }}>
            {correct ? "잘했어요! 다음 문제로 가요" : wrongWord ? `앗, ${withSubjectParticle(wrongWord.label)} 아니었어요` : "그림자를 누르면 소리가 나와요"}
          </span>
        </div>
        <button
          type="button"
          aria-label="소리 다시 듣기"
          onClick={replay}
          className={correct ? styles.pop : undefined}
          style={{ position: "absolute", right: sil.right, bottom: sil.bottom, width: sil.width, height: sil.height, borderRadius: 36, background: correct ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)", padding: 16, boxSizing: "border-box", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <img src={q.image} alt="" draggable={false} className={correct ? styles.revealed : styles.silhouette} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          <span style={{ position: "absolute", right: -4, top: -4, width: 64, height: 64, borderRadius: "50%", background: COLORS.sky, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 5px 0 ${COLORS.skyDark}` }}>
            <SpeakerIcon size={32} />
          </span>
        </button>
      </div>

      {/* 보기 3개 */}
      <div style={{ position: "absolute", left: 328, width: 858, top: 636, display: "flex", justifyContent: "center", gap: 24 }}>
        {state.choices.map((id) => (
          <ChoiceCard
            key={`${state.index}-${id}-${state.wrong === id ? state.wrongTick : 0}`}
            wordId={id}
            isAnswer={correct && id === answer}
            isWrong={state.wrong === id}
            dimmed={correct && id !== answer}
            width={230}
            height={176}
            imgW={170}
            imgH={110}
            fontSize={30}
            radius={32}
            onPick={() => pick(id)}
          />
        ))}
      </div>

      {state.done ? (
        <DoneOverlay
          character={character}
          total={state.order.length}
          subText={finishTextFor(topic, pageIndex)}
          nextLabel={nextLabelFor(topic, pageIndex)}
          onNext={nav.onNext}
          onRestart={restart}
        />
      ) : null}
    </div>
  );
}
