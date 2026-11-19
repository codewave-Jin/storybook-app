/**
 * 단어 그림책 고정 콘텐츠 (모든 책이 같은 배경·단어 그림·소리를 쓴다).
 * 아이마다 달라지는 건 캐릭터 이름과 표정 이미지 3장뿐이다.
 *
 * 좌표는 디자인 캔버스와 같은 1194×834 화면 기준 px 값이다.
 * 플레이어가 이 화면을 기기 크기에 맞춰 비율 그대로 확대·축소한다.
 *
 * 새 주제(색깔, 과일·채소)를 열 때는 WORDBOOK_WORDS 에 단어를 더하고
 * WORDBOOK_TOPICS 에 페이지를 채운 뒤 enabled 를 true 로 바꾸면 된다.
 */

export const WORDBOOK_STAGE = { width: 1194, height: 834 } as const;

const ASSET = "/wordbook";

export type WordbookTopicId = "animal" | "vehicle" | "color" | "food";

export type WordbookWord = {
  id: string;
  label: string;
  /** 소개 페이지에서 누르면 말풍선에 보이는 소리 흉내말 (예: "멍멍!") */
  sound: string;
  /** 투명 배경 WebP */
  image: string;
  /** 울음소리·효과음 파일. 없으면 임시 효과음(삐뽀)으로 대신한다 */
  soundFile?: string;
  /** 소리 크기 (0~1, 기본 1) */
  volume?: number;
  /** 소개 페이지에서 누르면 가운데 캐릭터가 하는 말. {N} 자리에 아이 이름이 들어간다 */
  talk: string;
};

/** 소개 페이지에 놓이는 단어 그림 상자 (1194×834 기준 px) */
export type WordbookPlacement = {
  word: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** 동물 게임: 실루엣 소리를 듣고 보기 3개 중에 고르기 */
export type WordbookSoundGame = {
  kind: "sound";
  /** 문제로 나올 단어 (순서는 매번 랜덤) */
  words: string[];
};

/** 탈것 게임: 힌트 그림·글자·실루엣을 보고 보기 3개 중에 고르기 */
export type WordbookHintQuestion = {
  word: string;
  /** 힌트 박스 안에 꽉 차게 들어가는 그림 */
  hintImage: string;
  /** 힌트 글자 */
  clue: string;
  /** 보기 3개 (정답 포함, 이 순서 그대로 보여 준다) */
  choices: string[];
  /** 실루엣 버튼 위치 (힌트 박스 안 기준 px). 없으면 오른쪽 아래 기본값 */
  silhouette?: { right: number; bottom: number; width: number; height: number };
};

export type WordbookHintGame = {
  kind: "hint";
  questions: WordbookHintQuestion[];
};

export type WordbookPage = {
  background: string;
  words: WordbookPlacement[];
  game: WordbookSoundGame | WordbookHintGame;
};

export type WordbookTopic = {
  id: WordbookTopicId;
  title: string;
  /** 홈 카드에 쓰는 대표 그림 (단어 id) */
  coverWord?: string;
  /** 홈 카드 색 */
  tone: { ring: string; shadow: string; circle: string; pill: string; pillText: string };
  enabled: boolean;
  /** 게임 화면 기본 배경 (탈것 힌트 퀴즈처럼 페이지 배경과 다르게 쓸 때) */
  gameBackground?: string;
  /** 마지막 게임을 다 맞혔을 때 문구 */
  finishText: string;
  pages: WordbookPage[];
};

/** 단어별 캐릭터 대사 (3살 눈높이, 한 문장). 쪽마다 하나는 아이 이름({N})이 들어간다 */
const TALK: Record<string, string> = {
  dog: "{N}도 강아지랑 놀래!",
  cat: "고양이 털이 보들보들해",
  cow: "소가 우유를 줘요",
  pig: "돼지 코는 동글동글!",
  bird: "새야, 훨훨 날아 봐!",
  giraffe: "기린 목은 정말 길다!",
  monkey: "{N}도 바나나 좋아해!",
  elephant: "코끼리 코가 길쭉길쭉",
  bear: "곰아, 꼭 안아 줘!",
  lion: "사자는 동물의 왕이야",
  fish: "{N}도 물고기처럼 헤엄칠래!",
  whale: "고래는 엄청 커!",
  turtle: "거북아, 천천히 가도 돼",
  shark: "상어 이빨 뾰족뾰족!",
  crab: "게는 옆으로 걸어요",
  train: "기차 타고 할머니 집에 가자",
  bus: "버스야, 나도 태워 줘!",
  car: "{N}도 자동차 타고 붕붕!",
  bike: "자전거 페달을 쌩쌩",
  "police-car": "경찰차가 우리를 지켜 줘요",
  ambulance: "구급차가 아픈 사람을 도와요",
  "fire-truck": "{N}도 소방관 할래!",
  "tow-truck": "견인차가 고장 난 차를 끌어요",
  ship: "배 타고 바다로 가자",
  airplane: "{N}도 비행기 타고 싶어!",
  excavator: "포크레인이 땅을 파요",
  truck: "트럭에 짐 싣고 출발!",
};

const w = (
  id: string,
  label: string,
  sound: string,
  options: { soundFile?: string; volume?: number } = {},
): WordbookWord => ({
  id,
  label,
  sound,
  image: `${ASSET}/words/${id}.webp`,
  talk: TALK[id] ?? "",
  ...(options.soundFile ? { soundFile: `${ASSET}/sounds/${options.soundFile}` } : {}),
  ...(options.volume != null ? { volume: options.volume } : {}),
});

export const WORDBOOK_WORDS: Record<string, WordbookWord> = Object.fromEntries(
  [
    // 동물 1
    w("dog", "강아지", "멍멍!", { soundFile: "dog.m4a" }),
    w("cat", "고양이", "야옹~", { soundFile: "cat.m4a" }),
    w("cow", "소", "음매~", { soundFile: "cow.m4a" }),
    w("pig", "돼지", "꿀꿀!", { soundFile: "pig.m4a" }),
    w("bird", "새", "짹짹!", { soundFile: "bird.m4a" }),
    // 동물 2
    w("giraffe", "기린", "냠냠~", { soundFile: "giraffe.m4a" }),
    w("monkey", "원숭이", "끼끼!", { soundFile: "monkey.m4a" }),
    w("elephant", "코끼리", "뿌우~", { soundFile: "elephant.m4a" }),
    w("bear", "곰", "크앙!", { soundFile: "bear.m4a" }),
    w("lion", "사자", "어흥!", { soundFile: "lion.m4a" }),
    // 동물 3 (물고기·거북이·게는 소리 파일 준비 중)
    w("fish", "물고기", "뻐끔뻐끔"),
    w("whale", "고래", "푸우~", { soundFile: "whale.m4a" }),
    w("turtle", "거북이", "엉금엉금"),
    w("shark", "상어", "덥석!", { soundFile: "shark.m4a" }),
    w("crab", "게", "집게 집게!"),
    // 탈것 1~3 (소리 파일 준비 중)
    w("train", "기차", "칙칙폭폭"),
    w("bus", "버스", "부릉부릉"),
    w("car", "자동차", "빵빵!"),
    w("bike", "자전거", "따르릉"),
    w("police-car", "경찰차", "애앵애앵"),
    w("ambulance", "구급차", "삐뽀삐뽀"),
    w("fire-truck", "소방차", "웨에엥~"),
    w("tow-truck", "견인차", "덜컹덜컹"),
    w("ship", "배", "뿌우~"),
    w("airplane", "비행기", "슈웅~"),
    w("excavator", "포크레인", "푹푹 영차"),
    w("truck", "트럭", "덜컹덜컹"),
  ].map((word) => [word.id, word]),
);

const hint = (id: string) => `${ASSET}/hints/${id}.jpg`;
const scene = (id: string) => `${ASSET}/scenes/${id}.jpg`;

export const WORDBOOK_TOPICS: WordbookTopic[] = [
  {
    id: "animal",
    title: "동물",
    coverWord: "dog",
    tone: { ring: "rgba(232,200,74,0.45)", shadow: "#F6E7C1", circle: "#FDF8EA", pill: "#F6E7C1", pillText: "#8A5A12" },
    enabled: true,
    finishText: "동물 친구들을 모두 만났어요",
    pages: [
      {
        background: scene("animal-1"),
        words: [
          { word: "dog", x: 96, y: 480, w: 210, h: 195 },
          { word: "cat", x: 872, y: 554, w: 120, h: 182 },
          { word: "cow", x: 200, y: 248, w: 250, h: 172 },
          { word: "pig", x: 797, y: 263, w: 210, h: 185 },
          { word: "bird", x: 635, y: 120, w: 190, h: 128 },
        ],
        game: { kind: "sound", words: ["dog", "cat", "cow", "pig", "bird"] },
      },
      {
        background: scene("animal-2"),
        words: [
          { word: "giraffe", x: 232, y: 147, w: 140, h: 335 },
          { word: "monkey", x: 522, y: 201, w: 150, h: 179 },
          { word: "elephant", x: 790, y: 258, w: 260, h: 190 },
          { word: "bear", x: 920, y: 492, w: 130, h: 271 },
          { word: "lion", x: 96, y: 550, w: 260, h: 213 },
        ],
        game: { kind: "sound", words: ["giraffe", "monkey", "elephant", "bear", "lion"] },
      },
      {
        background: scene("animal-3"),
        words: [
          { word: "fish", x: 783, y: 217, w: 180, h: 113 },
          { word: "whale", x: 346, y: 137, w: 340, h: 193 },
          { word: "turtle", x: 130, y: 330, w: 250, h: 148 },
          { word: "shark", x: 820, y: 440, w: 260, h: 195 },
          { word: "crab", x: 180, y: 610, w: 230, h: 116 },
        ],
        game: { kind: "sound", words: ["fish", "whale", "turtle", "shark", "crab"] },
      },
    ],
  },
  {
    id: "vehicle",
    title: "탈것",
    coverWord: "fire-truck",
    tone: { ring: "#7DD3FC", shadow: "#BAE6FD", circle: "#F0F9FF", pill: "#E0F2FE", pillText: "#0369A1" },
    enabled: true,
    finishText: "탈것 친구들을 모두 만났어요",
    pages: [
      {
        background: scene("vehicle-1"),
        words: [
          { word: "train", x: 172, y: 180, w: 400, h: 200 },
          { word: "bus", x: 810, y: 166, w: 270, h: 185 },
          { word: "car", x: 96, y: 502, w: 260, h: 200 },
          { word: "bike", x: 880, y: 535, w: 200, h: 187 },
        ],
        game: {
          kind: "hint",
          questions: [
            { word: "car", hintImage: hint("car"), clue: "우리 가족 여행 가요! 무엇을 타고 갈까?", choices: ["car", "bike", "train"] },
            { word: "bus", hintImage: hint("bus"), clue: "정류장에서 기다려요. 무엇을 타고 갈까?", choices: ["car", "bus", "train"] },
            { word: "train", hintImage: hint("train"), clue: "철길 옆에서 기다려요. 무엇을 타고 갈까?", choices: ["bike", "bus", "train"] },
            { word: "bike", hintImage: hint("bike"), clue: "헬멧을 썼어요! 무엇을 타고 갈까?", choices: ["bike", "car", "bus"] },
          ],
        },
      },
      {
        background: scene("vehicle-2"),
        words: [
          { word: "police-car", x: 96, y: 482, w: 250, h: 175 },
          { word: "ambulance", x: 315, y: 100, w: 250, h: 181 },
          { word: "fire-truck", x: 818, y: 482, w: 280, h: 194 },
          { word: "tow-truck", x: 757, y: 109, w: 240, h: 172 },
        ],
        game: {
          kind: "hint",
          questions: [
            { word: "police-car", hintImage: hint("police-car"), clue: "길을 잃었어요! 누가 도와줄까?", choices: ["ambulance", "police-car", "tow-truck"] },
            { word: "ambulance", hintImage: hint("ambulance"), clue: "넘어져서 다쳤어요! 누가 도와줄까?", choices: ["ambulance", "fire-truck", "police-car"] },
            { word: "fire-truck", hintImage: hint("fire-truck"), clue: "불이 났어요! 누가 출동할까?", choices: ["tow-truck", "police-car", "fire-truck"] },
            { word: "tow-truck", hintImage: hint("tow-truck"), clue: "자동차가 고장 났어요! 누가 도와줄까?", choices: ["tow-truck", "ambulance", "fire-truck"] },
          ],
        },
      },
      {
        background: scene("vehicle-3"),
        words: [
          { word: "ship", x: 297, y: 260, w: 230, h: 188 },
          { word: "airplane", x: 582, y: 125, w: 300, h: 185 },
          { word: "excavator", x: 96, y: 520, w: 260, h: 176 },
          { word: "truck", x: 820, y: 520, w: 240, h: 164 },
        ],
        game: {
          kind: "hint",
          questions: [
            {
              word: "ship",
              hintImage: hint("ship"),
              clue: "바다 건너 섬에 가요! 무엇을 타고 갈까?",
              choices: ["ship", "airplane", "truck"],
              silhouette: { right: 60, bottom: 140, width: 300, height: 230 },
            },
            {
              word: "airplane",
              hintImage: hint("airplane"),
              clue: "공항에 왔어요! 무엇을 타고 갈까?",
              choices: ["truck", "airplane", "ship"],
              silhouette: { right: 30, bottom: 165, width: 320, height: 200 },
            },
            { word: "excavator", hintImage: hint("excavator"), clue: "땅을 깊이 파야 해요! 누가 도와줄까?", choices: ["truck", "airplane", "excavator"] },
            { word: "truck", hintImage: hint("truck"), clue: "흙을 멀리 옮겨야 해요! 누가 도와줄까?", choices: ["truck", "excavator", "airplane"] },
          ],
        },
      },
    ],
  },
  {
    id: "color",
    title: "색깔",
    tone: { ring: "#C4B5FD", shadow: "#EDE9FE", circle: "#F5F3FF", pill: "#EDE9FE", pillText: "#6D28D9" },
    enabled: false,
    finishText: "색깔 친구들을 모두 만났어요",
    pages: [],
  },
  {
    id: "food",
    title: "과일·채소",
    tone: { ring: "rgba(224,122,95,0.4)", shadow: "#FDE8E0", circle: "#FFF6F3", pill: "#FDE8E0", pillText: "#B4432A" },
    enabled: false,
    finishText: "과일·채소 친구들을 모두 만났어요",
    pages: [],
  },
];

export function getWordbookTopic(id: WordbookTopicId) {
  const topic = WORDBOOK_TOPICS.find((item) => item.id === id);
  if (!topic) {
    throw new Error(`Unknown wordbook topic: ${id}`);
  }
  return topic;
}

export function getWordbookWord(id: string) {
  const word = WORDBOOK_WORDS[id];
  if (!word) {
    throw new Error(`Unknown wordbook word: ${id}`);
  }
  return word;
}

/** 주제에 들어 있는 단어 수 (홈 카드 "단어 N개") */
export function countTopicWords(topic: WordbookTopic) {
  return topic.pages.reduce((sum, page) => sum + page.words.length, 0);
}

/** 미리 받아 둘 에셋 목록 (그림·소리). 오프라인 저장 단계에서도 쓴다 */
export function wordbookAssetUrls() {
  const urls = new Set<string>();
  urls.add(`${ASSET}/scenes/cover.jpg`); // 시작 화면 표지
  urls.add(`${ASSET}/scenes/home.jpg`); // 홈 화면 배경
  for (const word of Object.values(WORDBOOK_WORDS)) {
    urls.add(word.image);
    if (word.soundFile) urls.add(word.soundFile);
  }
  for (const topic of WORDBOOK_TOPICS) {
    if (topic.gameBackground) urls.add(topic.gameBackground);
    for (const page of topic.pages) {
      urls.add(page.background);
      if (page.game.kind === "hint") {
        for (const question of page.game.questions) urls.add(question.hintImage);
      }
    }
  }
  return [...urls];
}

/** 부를 때 쓰는 이름: 받침이 있으면 "이" 를 붙인다 (하준 → 하준이, 지우 → 지우) */
export function callName(name: string) {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code < 11172 && code % 28 !== 0;
  return hasBatchim ? `${name}이` : name;
}

/** 캐릭터 대사에 아이 이름을 넣는다 */
export function talkLine(word: WordbookWord, childName: string) {
  return word.talk.replace("{N}", callName(childName));
}

/** 받침에 맞춰 "이/가" 를 붙인다 (곰이, 트럭이, 강아지가) */
export function withSubjectParticle(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code < 11172 && code % 28 !== 0;
  return `${word}${hasBatchim ? "이" : "가"}`;
}
