export type SpecialStickerKind = "nametag" | "clothing";
export type SpecialStickerKindOrGift = SpecialStickerKind | "gift";
export type ClothingTopicKey = "스승의날" | "어버이날" | "명절";
export type SpecialGender = "FEMALE" | "MALE";

export const SPECIAL_STICKER_KINDS = [
  {
    key: "nametag" as const,
    label: "이름표",
    description: "이름과 성별로 이름표를 만들어요.",
    disabled: false,
  },
  {
    key: "clothing" as const,
    label: "의류스티커",
    description: "주제에 맞는 옷을 입혀요.",
    disabled: false,
  },
  {
    key: "gift" as const,
    label: "답례품",
    description: "고마운 마음을 전하는 답례품이에요.",
    disabled: true,
  },
] as const;

export const CLOTHING_TOPICS = [
  {
    key: "스승의날" as const,
    label: "스승의날",
    defaultPhrase: "선생님 사랑해요, 오늘 선물은 바로 저에요♥",
  },
  {
    key: "어버이날" as const,
    label: "어버이날",
    defaultPhrase: "엄마 아빠 사랑해요, 오늘 선물은 바로 저에요♥",
  },
  {
    key: "명절" as const,
    label: "명절",
    defaultPhrase: "즐거운 명절 보내세요♥",
  },
] as const;

export const SPECIAL_GENDER_OPTIONS = [
  { key: "FEMALE" as const, label: "여자" },
  { key: "MALE" as const, label: "남자" },
] as const;

export function clothingTopicByKey(key: string) {
  return CLOTHING_TOPICS.find((item) => item.key === key) ?? null;
}

export function defaultPhraseForClothingTopic(topic: ClothingTopicKey) {
  return clothingTopicByKey(topic)?.defaultPhrase ?? "";
}

export function specialKindLabel(kind: SpecialStickerKindOrGift | null) {
  return SPECIAL_STICKER_KINDS.find((item) => item.key === kind)?.label ?? null;
}

export function buildSpecialStickerPrompt(input: {
  kind?: SpecialStickerKind;
  topic: string;
  phrase: string;
  genderLabel?: string;
}) {
  if (input.kind === "nametag") {
    const parts = [
      "투명 배경의 다이컷 이름표 스티커를 만들어라. 배경, 바닥, 스튜디오, 그림자 벽, 네모난 캔버스 채우기는 절대 그리지 말 것.",
      "입력 이미지의 얼굴·헤어·이목구비만 유지한다.",
      "구도: 캐릭터 상반신(머리~팔꿈치)이 화면의 주인공이다. 캐릭터는 이미지 높이의 약 65~75%를 차지하고, 아래쪽 작은 이름판 위에 팔을 얹고 얼굴을 내민다.",
      "이름판은 어깨 너비 정도의 작고 둥근 배너이며, 이미지 높이의 20~30%만 차지한다. 이름판이 화면을 가득 채우거나 캐릭터보다 커지면 안 된다.",
      "전신 캐릭터, 서 있는 아이, 가슴에 작은 명찰만 단 초상화는 금지.",
      "그림체는 수채화 스타일의 귀여운 스티커.",
      `주제 : 이름표 문구 : ${input.phrase}`,
    ];
    if (input.genderLabel) {
      parts.push(`성별 : ${input.genderLabel}`);
    }
    return parts.join(" ");
  }

  const parts = [
    "투명 배경의 다이컷 캐릭터 스티커를 만들어라. 배경, 바닥, 스튜디오, 네모난 캔버스 채우기는 절대 그리지 말 것.",
    "입력된 이미지의 캐릭터 정체성을 유지해야함.",
    "의상 및 헤어스타일은 변형 가능.",
    "그림체는 수채화 스타일로.",
    `주제 : ${input.topic} 문구 : ${input.phrase}`,
  ];
  if (input.genderLabel) {
    parts.push(`성별 : ${input.genderLabel}`);
  }
  return parts.join(" ");
}

export type SpecialGenerateInput =
  | {
      kind: "nametag";
      name: string;
      gender: SpecialGender;
    }
  | {
      kind: "clothing";
      topic: ClothingTopicKey;
      phrase: string;
    };

export function specialGenerateTopic(input: SpecialGenerateInput) {
  return input.kind === "nametag" ? "이름표" : input.topic;
}

export function specialGeneratePhrase(input: SpecialGenerateInput) {
  return input.kind === "nametag" ? input.name : input.phrase;
}

export const SPECIAL_STICKER_HINT_PREFIX = "special:";

export function specialStickerCostumeHint(input: SpecialGenerateInput) {
  return input.kind === "nametag"
    ? `${SPECIAL_STICKER_HINT_PREFIX}nametag`
    : `${SPECIAL_STICKER_HINT_PREFIX}clothing:${input.topic}`;
}

export function isSpecialStickerHint(hint: string | null | undefined) {
  return Boolean(hint?.startsWith(SPECIAL_STICKER_HINT_PREFIX));
}

export function parseSpecialGenerateBody(
  body: unknown,
): SpecialGenerateInput | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "생성 정보를 확인해 주세요." };
  }

  const data = body as {
    kind?: unknown;
    characterId?: unknown;
    name?: unknown;
    gender?: unknown;
    topic?: unknown;
    phrase?: unknown;
  };

  if (data.kind === "nametag") {
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const gender = data.gender === "FEMALE" || data.gender === "MALE" ? data.gender : null;
    if (!name) {
      return { error: "이름을 입력해 주세요." };
    }
    if (!gender) {
      return { error: "성별을 선택해 주세요." };
    }
    return { kind: "nametag", name, gender };
  }

  if (data.kind === "clothing") {
    const topic =
      typeof data.topic === "string" ? clothingTopicByKey(data.topic)?.key : null;
    const phrase = typeof data.phrase === "string" ? data.phrase.trim() : "";
    if (!topic) {
      return { error: "주제를 선택해 주세요." };
    }
    if (!phrase) {
      return { error: "문구를 입력해 주세요." };
    }
    return { kind: "clothing", topic, phrase };
  }

  return { error: "특수 제작 종류를 선택해 주세요." };
}
