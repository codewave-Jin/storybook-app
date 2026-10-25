export type SpecialStickerKind = "nametag" | "clothing" | "gift";
export type SpecialStickerKindOrGift = SpecialStickerKind;
export type ClothingTopicKey = "스승의날" | "어버이날" | "명절";
export type GiftTopicKey = "백일답례품";
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
    description: "옷에 붙일수 있는 대형 스티커를 만들어요",
    disabled: false,
  },
  {
    key: "gift" as const,
    label: "답례품",
    description: "고마운 마음을 전하는 답례품이에요.",
    disabled: false,
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

export const GIFT_TOPICS = [
  {
    key: "백일답례품" as const,
    label: "백일답례품",
    defaultPhrase: "백일을 축하해주셔서 감사합니다♥",
  },
] as const;

export const SPECIAL_GENDER_OPTIONS = [
  { key: "FEMALE" as const, label: "여자" },
  { key: "MALE" as const, label: "남자" },
] as const;

export function clothingTopicByKey(key: string) {
  return CLOTHING_TOPICS.find((item) => item.key === key) ?? null;
}

export function giftTopicByKey(key: string) {
  return GIFT_TOPICS.find((item) => item.key === key) ?? null;
}

export function defaultPhraseForClothingTopic(topic: ClothingTopicKey) {
  return clothingTopicByKey(topic)?.defaultPhrase ?? "";
}

export function defaultPhraseForGiftTopic(topic: GiftTopicKey) {
  return giftTopicByKey(topic)?.defaultPhrase ?? "";
}

export function specialKindLabel(kind: SpecialStickerKindOrGift | null) {
  return SPECIAL_STICKER_KINDS.find((item) => item.key === kind)?.label ?? null;
}

export function specialGenderLabel(gender: SpecialGender | null | undefined) {
  return SPECIAL_GENDER_OPTIONS.find((item) => item.key === gender)?.label;
}

const OUTFIT_MAX_LENGTH = 80;

export function normalizeSpecialOutfits(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, 2).map((item) =>
    typeof item === "string" ? item.trim().slice(0, OUTFIT_MAX_LENGTH) : "",
  );
}

function costumePrompt(input: {
  kind?: SpecialStickerKind;
  twins?: boolean;
  outfits?: string[];
}) {
  const first = input.outfits?.[0]?.trim() ?? "";
  const second = input.outfits?.[1]?.trim() ?? "";
  const giftFallback = "성별에 맞는 아기 한복";

  if (input.twins) {
    if (!first && !second && input.kind !== "gift") {
      return "의상 및 헤어스타일은 변형 가능.";
    }
    const firstClothes = first || (input.kind === "gift" ? giftFallback : "입력 이미지의 옷");
    const secondClothes = second || (input.kind === "gift" ? giftFallback : "입력 이미지의 옷");
    return `첫 번째 캐릭터가 입을 옷은 ${firstClothes}. 두 번째 캐릭터가 입을 옷은 ${secondClothes}. 각자의 얼굴과 이목구비는 입력 이미지 그대로 유지한다.`;
  }

  if (first) {
    return `캐릭터가 입을 옷은 ${first}. 얼굴과 이목구비는 입력 이미지 그대로 유지한다.`;
  }
  if (input.kind === "gift") {
    return "옷은 성별에 맞는 아기 한복으로 바꾼다. 얼굴과 이목구비는 입력 이미지 그대로 유지한다.";
  }
  if (input.kind === "nametag") {
    return "";
  }
  return "의상 및 헤어스타일은 변형 가능.";
}

const GIFT_DEFAULT_OUTFIT = "성별에 맞는 아기 한복";

export function buildGiftStickerPrompt(input: {
  phrase: string;
  characters: { genderLabel: string; outfit: string }[];
}) {
  const characters = input.characters.slice(0, 2).map((character) => ({
    genderLabel: character.genderLabel.trim() || "미입력",
    outfit: character.outfit.trim() || GIFT_DEFAULT_OUTFIT,
  }));
  const count = characters.length;
  const characterBlocks = characters
    .map(
      (character, index) =>
        [
          `캐릭터 ${index + 1}`,
          `- 참고 이미지: 첨부된 ${index + 1}번째 이미지`,
          `- 성별: ${character.genderLabel}`,
          `- 의상: ${character.outfit}`,
        ].join("\n"),
    )
    .join("\n\n");

  return [
    "당신은 고급 아동 동화책 일러스트와 맞춤형 기념품 디자인을 전문으로 하는 일러스트레이터다.",
    "첨부된 캐릭터 이미지로 생후 100일 아기 기념 답례품 스티커를 만든다.",
    "스타일 레퍼런스 이미지는 없다. 첨부된 이미지는 모두 캐릭터 얼굴 참고 이미지고, 그림체와 스티커 디자인은 아래 설명을 기준으로 한다.",
    "가장 중요한 목표는 각 캐릭터의 얼굴 생김새를 최대한 유지하면서 실제 생후 100일 아기처럼 자연스럽고 사랑스럽게 표현하는 것이다.",
    "",
    "입력 정보",
    `- 캐릭터 수: ${count}명`,
    characterBlocks,
    "스티커 문구",
    input.phrase,
    "입력되지 않은 캐릭터는 만들지 않는다. 각 캐릭터의 성별과 의상은 그 캐릭터에게만 적용한다.",
    "",
    "캐릭터 얼굴",
    "캐릭터 이미지는 그 아기의 얼굴 생김새를 정하는 기준이다. 얼굴형, 눈의 모양·크기·간격, 쌍꺼풀과 눈매, 코, 입술, 눈썹, 피부색, 머리색과 헤어라인, 그 캐릭터를 구별하는 고유한 얼굴 특징을 유지한다.",
    "단순히 귀여운 아기를 새로 만들지 말고, 입력된 캐릭터와 같은 인물이 생후 100일이었을 때의 모습을 그린다. 개성을 지우거나 평범한 아기 얼굴로 바꾸지 않는다.",
    count > 1
      ? "두 캐릭터의 얼굴 특징을 섞지 말고, 한 명으로 합치거나 한 명을 빼지 않는다."
      : "캐릭터는 첨부된 한 명만 그린다.",
    "",
    "생후 100일 표현",
    "모든 캐릭터는 성별과 관계없이 생후 약 100일, 3개월 정도의 영아로 그린다. 입력 캐릭터가 더 커 보여도 고유한 얼굴 특징은 유지하고 연령만 낮춘다.",
    "얼굴은 머리가 크고 둥글며, 볼이 통통하고, 턱이 짧고 둥글며, 코는 작고, 눈매는 원본을 유지한 아기 눈이다. 피부는 부드럽고 볼에는 은은한 홍조가 있다.",
    "몸은 머리에 비해 작고 통통하며, 목이 매우 짧고, 어깨는 작고 둥글며, 팔과 손은 짧고 통통하다.",
    "1~3세 어린이처럼 성숙하게 그리거나, 목을 길게, 팔다리를 길게, 눈을 지나치게 크게, 얼굴을 원본과 다르게 둥글게 바꾸지 않는다. 성인 얼굴을 축소한 모습도 금지한다.",
    "",
    "성별과 헤어",
    "성별은 각 캐릭터에 적힌 입력값을 따른다. 성별 때문에 얼굴 생김새를 바꾸지 않는다.",
    "남자아이에게 짧은 머리를, 여자아이에게 긴 머리나 양갈래를 무조건 적용하지 않는다. 헤어스타일은 원본 특징을 유지하고, 생후 100일 아기에게 맞게 볼륨과 길이만 자연스럽게 조정할 수 있다. 머리 장식은 작아야 하고 얼굴을 가리면 안 된다.",
    "",
    "의상",
    "각 캐릭터에게 위에 적힌 의상을 정확하게 입힌다. 원본 이미지의 옷보다 입력한 의상을 우선한다.",
    "의상 종류, 색, 주요 디자인을 유지하고, 생후 100일 체형에 맞게 부드러운 옷감과 자연스러운 주름으로 입힌다. 옷이 얼굴을 가리면 안 된다.",
    "한복이면 전통 한복의 형태를 유지하면서 부드러운 파스텔 색감과 섬세한 자수를 넣는다. 다른 옷이면 그 디자인을 존중하고 전체 그림체와 어울리게 그린다.",
    "",
    "포즈와 배치",
    "부드럽고 폭신한 아이보리색 담요 위에 엎드린 자세다. 작은 팔을 앞으로 모으고, 팔꿈치와 팔뚝으로 상체를 가볍게 지지하며, 고개를 살짝 들어 정면을 본다. 고개를 지나치게 들거나 턱을 괴지 않는다. 앉거나 서거나 걷는 자세는 쓰지 않는다.",
    count > 1
      ? "두 캐릭터를 나란히 두고 얼굴 크기를 비슷하게 한다. 가까이 있지만 얼굴이 겹치거나 가리지 않는다. 같은 캐릭터를 두 번 그리지 않는다."
      : "캐릭터 한 명을 상단 중앙에 두고 얼굴이 충분히 크게 보이게 한다. 양쪽에 꽃과 장식을 자연스럽게 둔다.",
    "",
    "그림체",
    "부드러운 세미리얼 동화책 일러스트, 은은한 수채화 느낌의 디지털 페인팅, 자연스러운 피부, 따뜻하고 밝은 파스텔 색감, 과장되지 않은 얼굴, 아기 특유의 통통한 비율로 그린다.",
    "사진처럼 사실적이거나, 플라스틱 인형 같은 3D, 과장된 애니메이션, 지나치게 큰 눈, 강한 외곽선, 강한 피부 광택, 지나치게 선명한 색은 피한다.",
    "",
    "스티커 디자인",
    "정사각형 캔버스 한가운데에 원형 스티커를 그린다. 캐릭터, 작은 장식, 문구는 모두 그 원 안에 두고, 원 밖은 비어 있는 따뜻한 아이보리색만 둔다.",
    "원형은 스티커의 구도와 형태로 유지한다. 원을 따라 그리는 꽃 테두리, 꽃다발 링, 잎 화환, 하트 링, 리본 링, 선으로 된 원형 테두리, 프레임, 외곽선은 그리지 않는다.",
    "연분홍과 복숭아색 꽃, 은은한 초록 잎, 작은 분홍 하트, 부드러운 분홍 리본은 캐릭터 옆이나 문구 근처의 작은 장식으로만 둔다. 원 가장자리에 이어 붙여 테두리처럼 만들지 않는다. 장식은 캐릭터보다 강조되지 않는다.",
    input.phrase.trim()
      ? "상단에는 아기 캐릭터와 꽃·하트, 하단에는 문구, 맨 아래에는 작은 꽃과 분홍 리본을 둔다. 글자와 장식, 얼굴이 겹치지 않게 한다."
      : "상단에는 아기 캐릭터와 꽃·하트, 맨 아래에는 작은 꽃과 분홍 리본을 둔다. 글자는 그리지 말고, 얼굴과 장식이 겹치지 않게 한다.",
    "",
    "문구",
    ...(input.phrase.trim()
      ? [
          "다음 문구를 한 글자도 바꾸지 말고 그대로 적는다. 띄어쓰기와 기호를 유지한다.",
          input.phrase.trim(),
          "가독성이 좋은 따뜻한 색의 손글씨로 쓰고, 얼굴이나 주요 장식과 겹치지 않게 한다.",
        ]
      : [
          "문구가 없다. 한글, 영어, 숫자, 문장, 낙관을 포함한 어떤 글자도 그리지 않는다.",
        ]),
    "",
    "우선순위는 1. 원본 얼굴 동일성, 2. 생후 100일 아기 표현, 3. 위 그림체, 4. 캐릭터 수·성별·의상·문구, 5. 원형 구도이되 꽃 테두리 없는 장식 순이다.",
  ].join("\n");
}

export function buildSpecialStickerPrompt(input: {
  kind?: SpecialStickerKind;
  topic: string;
  phrase: string;
  genderLabel?: string;
  twins?: boolean;
  outfits?: string[];
  characters?: { genderLabel: string; outfit: string }[];
}) {
  if (input.kind === "gift") {
    const outfits = input.outfits ?? [];
    const characters =
      input.characters && input.characters.length > 0
        ? input.characters
        : [
            {
              genderLabel: input.genderLabel ?? "",
              outfit: outfits[0] ?? "",
            },
            ...(input.twins
              ? [{ genderLabel: "", outfit: outfits[1] ?? "" }]
              : []),
          ];
    return buildGiftStickerPrompt({ phrase: input.phrase, characters });
  }

  const costume = costumePrompt(input);

  if (input.kind === "nametag") {
    const parts = [
      "투명 배경의 다이컷 이름표 스티커를 만들어라. 배경, 바닥, 스튜디오, 그림자 벽, 네모난 캔버스 채우기는 절대 그리지 말 것.",
      input.twins
        ? "입력 이미지는 순서대로 서로 다른 두 캐릭터다. 두 명 모두 나오게 하고, 각자의 얼굴과 이목구비를 유지한다. 한 명으로 합치거나 한 명을 빼지 말 것."
        : "입력 이미지의 얼굴·헤어·이목구비만 유지한다.",
      "구도: 캐릭터 상반신(머리~팔꿈치)이 화면의 주인공이다. 캐릭터는 이미지 높이의 약 65~75%를 차지하고, 아래쪽 작은 이름판 위에 팔을 얹고 얼굴을 내민다.",
      "이름판은 어깨 너비 정도의 작고 둥근 배너이며, 이미지 높이의 20~30%만 차지한다. 이름판이 화면을 가득 채우거나 캐릭터보다 커지면 안 된다.",
      "전신 캐릭터, 서 있는 아이, 가슴에 작은 명찰만 단 초상화는 금지.",
      ...(costume ? [costume] : []),
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
    input.twins
      ? "입력 이미지는 순서대로 서로 다른 두 캐릭터다. 두 명 모두 스티커에 나오게 하고, 각자의 얼굴과 이목구비를 유지한다. 한 명으로 합치거나 한 명을 빼지 말 것."
      : "입력된 이미지의 캐릭터 정체성을 유지해야함.",
    costume,
    "그림체는 수채화 스타일로.",
    input.phrase.trim()
      ? `주제 : ${input.topic} 문구 : ${input.phrase.trim()}`
      : `주제 : ${input.topic} 문구는 그리지 말 것. 한글, 영어, 숫자를 넣지 말 것.`,
  ];
  if (input.genderLabel) {
    parts.push(`성별 : ${input.genderLabel}`);
  }
  return parts.join(" ");
}

type SpecialCharacterFields = {
  outfits: string[];
  companionCharacterId: string | null;
};

export type SpecialGenerateInput =
  | ({
      kind: "nametag";
      name: string;
      gender: SpecialGender;
    } & SpecialCharacterFields)
  | ({
      kind: "clothing";
      topic: ClothingTopicKey;
      phrase: string;
    } & SpecialCharacterFields)
  | ({
      kind: "gift";
      topic: GiftTopicKey;
      phrase: string;
      twins: boolean;
    } & SpecialCharacterFields);

export function specialGenerateTopic(input: SpecialGenerateInput) {
  return input.kind === "nametag" ? "이름표" : input.topic;
}

export function specialGeneratePhrase(input: SpecialGenerateInput) {
  return input.kind === "nametag" ? input.name : input.phrase;
}

export const SPECIAL_STICKER_HINT_PREFIX = "special:";

export function specialStickerCostumeHint(input: SpecialGenerateInput) {
  if (input.kind === "nametag") {
    return `${SPECIAL_STICKER_HINT_PREFIX}nametag`;
  }
  const topicHint = `${SPECIAL_STICKER_HINT_PREFIX}${input.kind}:${input.topic}`;
  return input.kind === "gift" && input.twins ? `${topicHint}:twins` : topicHint;
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
    twins?: unknown;
    companionCharacterId?: unknown;
    outfits?: unknown;
  };
  const outfits = normalizeSpecialOutfits(data.outfits);
  const companionCharacterId =
    typeof data.companionCharacterId === "string"
      ? data.companionCharacterId.trim()
      : "";

  if (data.kind === "nametag") {
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const gender = data.gender === "FEMALE" || data.gender === "MALE" ? data.gender : null;
    if (!name) {
      return { error: "이름을 입력해 주세요." };
    }
    if (!gender) {
      return { error: "성별을 선택해 주세요." };
    }
    return {
      kind: "nametag",
      name,
      gender,
      outfits,
      companionCharacterId: companionCharacterId || null,
    };
  }

  if (data.kind === "clothing") {
    const topic =
      typeof data.topic === "string" ? clothingTopicByKey(data.topic)?.key : null;
    const phrase = typeof data.phrase === "string" ? data.phrase.trim() : "";
    if (!topic) {
      return { error: "주제를 선택해 주세요." };
    }
    return {
      kind: "clothing",
      topic,
      phrase,
      outfits,
      companionCharacterId: companionCharacterId || null,
    };
  }

  if (data.kind === "gift") {
    const topic = typeof data.topic === "string" ? giftTopicByKey(data.topic)?.key : null;
    const phrase = typeof data.phrase === "string" ? data.phrase.trim() : "";
    if (!topic) {
      return { error: "주제를 선택해 주세요." };
    }
    const twins = data.twins === true || Boolean(companionCharacterId);
    if (twins && !companionCharacterId) {
      return { error: "함께 나올 캐릭터를 한 명 더 골라 주세요." };
    }
    return {
      kind: "gift",
      topic,
      phrase,
      twins,
      outfits,
      companionCharacterId: twins ? companionCharacterId : null,
    };
  }

  return { error: "특수 제작 종류를 선택해 주세요." };
}
