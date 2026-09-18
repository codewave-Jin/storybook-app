import {
  clampStickerLayout,
  createDecalLayer,
  createPhraseLayer,
  decalLayerKey,
  phraseLayerKey,
  stickerLayoutFromPhrases,
  type StickerLayoutState,
} from "@/lib/sticker-layout-constants";

export type StickerExampleKey = "birthday" | "thanks" | "congrats";
export type StickerMakeMode = StickerExampleKey | "diy" | "special";

export const STICKER_EXAMPLES = [
  {
    key: "birthday",
    label: "생일",
    description: "생일 문구 예시",
    borderKey: "birthday",
    phrases: [
      "생 일",
      "아이의 생일을\n축하해주셔서 \n감사합니다",
      "엄마&아빠",
    ],
  },
  {
    key: "thanks",
    label: "감사인사",
    description: "고마운 마음을 전해요",
    borderKey: "carnation",
    phrases: [
      "감사합니다 ♥",
      "늘 예뻐해 주시고 \n사랑으로 키워주셔서 \n감사합니다",
    ],
  },
  {
    key: "congrats",
    label: "축하인사",
    description: "기쁜 날을 축하해요",
    borderKey: "stars-moon",
    phrases: ["축하해요", "행복한 하루\n되세요"],
  },
] as const;

export function stickerPossessiveName(characterLabel: string) {
  const name = characterLabel.trim() || "아이";
  return name.endsWith("의") ? name : `${name}의`;
}

export function phrasesForExample(
  key: StickerExampleKey,
  characterLabel = "",
): string[] {
  if (key === "birthday") {
    return [
      "생 일",
      `${stickerPossessiveName(characterLabel)} 생일을\n축하해주셔서 \n감사합니다`,
      "엄마&아빠",
    ];
  }
  const example = STICKER_EXAMPLES.find((item) => item.key === key);
  return example ? [...example.phrases] : [];
}

export function configForMakeMode(
  mode: StickerMakeMode,
  characterLabel = "",
): {
  borderKey: string;
  phrases: string[];
} {
  if (mode === "diy" || mode === "special") {
    return { borderKey: "none", phrases: [] };
  }
  const example = STICKER_EXAMPLES.find((item) => item.key === mode);
  return {
    borderKey: example?.borderKey ?? "none",
    phrases: example ? phrasesForExample(example.key, characterLabel) : [],
  };
}

function birthdayLayout(characterLabel: string): StickerLayoutState {
  const [title, body, signoff] = phrasesForExample("birthday", characterLabel);
  const phrase1 = createPhraseLayer(0, title);
  phrase1.box = {
    leftRatio: 0.3557291666666667,
    topRatio: 0.22492559523809527,
    widthRatio: 0.56,
    heightRatio: 0.24,
  };
  phrase1.style = { fontKey: "kedu-line", scale: 1.6 };

  const phrase2 = createPhraseLayer(1, body);
  phrase2.box = {
    leftRatio: 0.3661822916666667,
    topRatio: 0.47637559523809514,
    widthRatio: 0.543,
    heightRatio: 0.2996,
  };
  phrase2.style = { fontKey: "jua", scale: 0.6 };

  const phrase3 = createPhraseLayer(2, signoff ?? "엄마&아빠");
  phrase3.box = {
    leftRatio: 0.30562500000000015,
    topRatio: 0.8,
    widthRatio: 0.405,
    heightRatio: 0.122,
  };
  phrase3.style = { fontKey: "jua", scale: 0.6 };

  const heart = createDecalLayer(0, "heart");
  heart.box = {
    leftRatio: 0.5703385416666666,
    topRatio: 0.159702380952381,
    widthRatio: 0.12,
    heightRatio: 0.12,
  };

  return clampStickerLayout({
    character: {
      leftRatio: -0.04535,
      topRatio: 0.171352380952381,
      widthRatio: 0.6141,
      heightRatio: 0.6141,
    },
    characterVisible: true,
    border: {
      scale: 1.1102,
      offsetXRatio: -0.007808333333333333,
      offsetYRatio: 0.010570833333333331,
    },
    borderVisible: true,
    phrases: [phrase1, phrase2, phrase3],
    decals: [heart],
    stack: [
      "character",
      phraseLayerKey(phrase1.id),
      phraseLayerKey(phrase2.id),
      phraseLayerKey(phrase3.id),
      "border",
      decalLayerKey(heart.id),
    ],
  });
}

function thanksLayout(): StickerLayoutState {
  const [title, body] = phrasesForExample("thanks");
  const phrase1 = createPhraseLayer(0, title);
  phrase1.box = {
    leftRatio: 0.28946875,
    topRatio: 0.32135714285714284,
    widthRatio: 0.7845,
    heightRatio: 0.158,
  };
  phrase1.style = { fontKey: "kedu-line", scale: 0.9 };

  const phrase2 = createPhraseLayer(1, body);
  phrase2.box = {
    leftRatio: 0.308203125,
    topRatio: 0.552607142857143,
    widthRatio: 0.635,
    heightRatio: 0.258,
  };
  phrase2.style = { fontKey: "kedu", scale: 0.5 };

  const heart = createDecalLayer(0, "heart");
  heart.box = {
    leftRatio: 0.44859375,
    topRatio: 0.15821428571428575,
    widthRatio: 0.12,
    heightRatio: 0.12,
  };

  return clampStickerLayout({
    character: {
      leftRatio: -0.066834375,
      topRatio: 0.2279,
      widthRatio: 0.6141,
      heightRatio: 0.6141,
    },
    characterVisible: true,
    border: {
      scale: 1.121302,
      offsetXRatio: -0.00650625,
      offsetYRatio: 0.008710714285714283,
    },
    borderVisible: true,
    phrases: [phrase1, phrase2],
    decals: [heart],
    stack: [
      "character",
      phraseLayerKey(phrase2.id),
      "border",
      phraseLayerKey(phrase1.id),
      decalLayerKey(heart.id),
    ],
  });
}

export function layoutForMakeMode(mode: StickerMakeMode, characterLabel = "") {
  if (mode === "special") {
    return clampStickerLayout({
      character: {
        leftRatio: 0.05,
        topRatio: 0.05,
        widthRatio: 0.9,
        heightRatio: 0.9,
      },
      characterVisible: true,
      border: { scale: 1, offsetXRatio: 0, offsetYRatio: 0 },
      borderVisible: false,
      phrases: [],
      decals: [],
      stack: ["character"],
    });
  }
  if (mode === "birthday") {
    return birthdayLayout(characterLabel);
  }
  if (mode === "thanks") {
    return thanksLayout();
  }
  return stickerLayoutFromPhrases(configForMakeMode(mode, characterLabel).phrases);
}

export function makeModeLabel(mode: StickerMakeMode | null) {
  if (mode === "diy") {
    return "간단 제작";
  }
  if (mode === "special") {
    return "특수 제작";
  }
  return STICKER_EXAMPLES.find((item) => item.key === mode)?.label ?? null;
}
