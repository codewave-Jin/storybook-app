import { skipsStyleTransfer } from "@/lib/art-styles";

/**
 * 숲속 생일파티 동화책(선택 가능한 활성 템플릿) — 표지 1장 + 펼침 8장
 *
 * 이 파일은 그 한 권에만 해당한다. 다른 동화책 템플릿은 DB PageTemplate을 쓴다.
 *
 * 수정 방법
 * 1) BIRTHDAY_PAGES 에서 쪽(pageNumber)을 찾는다
 * 2) story 는 인쇄용 동화 문장, illustration 은 GPT 삽화 지시
 * 3) cast 는 생성에 넣을 사람 사진: hero / extraOptional / none
 * 4) 저장하면 로컬에서 새로 만드는 주문부터 반영된다
 *
 * 나이는 이 책 스토리를 바꾸지 않는다. 캐릭터 모습도 바꾸지 않는다.
 *
 * illustration 에 쓸 수 있는 값
 *   {{character_1}}              주인공 이름
 *   {{character_2}}              추가 등장인물 이름 (있을 때만)
 *   {{answer.favorite_color}}    빨강/노랑/초록/파랑/분홍/보라
 *   {{answer.favorite_animal}}   토끼/곰/강아지/고양이/코끼리/기린
 */

export const BIRTHDAY_BOOK_TITLE = "두근두근 생일 파티";

/** 표지 1 + 펼침 8 = GPT 이미지 9장 */
export const FOREST_BIRTHDAY_PAGE_COUNT = 9;

export type BirthdayCast = "hero" | "extraOptional" | "none";

function isMomOrDadCastLabel(label: string) {
  return /엄마|아빠|아버지|어머니|부모|할머니|할아버지/.test(label);
}

/** 엄마/아빠 역할: 어른 몸 OK, 얼굴은 입력 캐릭터 그대로. */
function extraCastFaceRule(hasMomOrDad: boolean) {
  return hasMomOrDad
    ? "엄마/아빠로 들어간 사람은 어른 몸·어른 크기로 그려도 됩니다. 얼굴만 그 사람의 입력 캐릭터 이미지와 같게 하세요. 주인공 얼굴로 섞거나, 평범한 동화 어른 얼굴로 바꾸지 마세요."
    : "";
}

export function buildStyleCharacterPrompt(
  artStyleKey?: string | null,
  options?: { label?: string | null },
): string {
  const medium =
    artStyleSceneHint(artStyleKey) ||
    "두 번째 이미지의 선, 채색, 질감만 가져오세요.";
  const label = options?.label?.trim() || "";
  const adultCast = isMomOrDadCastLabel(label);

  return [
    "첫 번째 이미지는 유지해야 할 캐릭터입니다.",
    "두 번째 이미지는 그림체 샘플입니다.",
    "첫 번째 사람을 두 번째 그림체로 다시 그리세요. 다른 사람으로 바꾸면 실패입니다.",
    label ? `이 사람은 ${label}입니다.` : "",
    adultCast
      ? `${label} 역할은 엄마/아빠입니다. 몸과 키는 어른이어도 됩니다. 얼굴은 첫 번째 이미지와 같은 사람이어야 합니다. 아이 얼굴로 바꾸지 말고, 더 나이 든 다른 어른 얼굴로 다시 그리지도 마세요.`
      : "나이를 바꾸지 마세요. 어른을 아이로, 아이를 어른으로 만들지 마세요.",
    "",
    "[얼굴 — 첫 번째 이미지에서만 복사]",
    "- 얼굴형, 눈의 크기·간격·모양, 눈썹, 코, 입, 볼살, 턱선, 피부톤",
    "- 조금만 달라도 오류입니다. 다시 창작하지 말 것",
    "- 나이를 바꾸거나 예쁘게 다듬지 말 것",
    "- 일반적인 동화 얼굴로 평균화하지 말 것",
    "- 두 번째 이미지 속 인물의 얼굴, 헤어, 의상, 몸, 포즈, 배경, 동물을 절대 가져오지 말 것",
    "",
    "[그림체 — 두 번째 이미지에서만]",
    "- 선, 채색, 질감, 렌더링 방식만 가져올 것",
    "- 구도와 장면은 가져오지 말 것",
    medium,
    "",
    "[그 외 유지]",
    "- 첫 번째 이미지의 헤어스타일, 머리색",
    "- 정면 상반신 구도",
    "",
    "[바꿔도 되는 것]",
    "- 의상. 첫 번째 이미지 옷을 그대로 입히지 않아도 됩니다. 그림체에 맞는 옷으로 바꿔도 됩니다",
    "- 두 번째 이미지 속 인물의 옷은 가져오지 말 것",
    "",
    "[바꿀 것]",
    "- 광택·하이라이트·사진 같은 피부 음영은 제거할 것",
    "- 표정은 중립이거나 아주 옅은 미소. 이목구비 위치는 그대로",
    "",
    "배경은 밝은 단색으로 해주세요.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** @deprecated 그림체 key를 넣어 buildStyleCharacterPrompt를 쓰세요. */
export const STYLE_CHARACTER_PROMPT = buildStyleCharacterPrompt();

/** 삽화에 넣는 초상화(그림체 변환본, 기본이면 원본)마다 번호를 고정한다. */
export function buildFaceIdentityImageRoles(
  characters: Array<{ label: string }>,
): string {
  const named = characters
    .map((character) => character.label.trim() || "주인공")
    .filter(Boolean);
  if (named.length === 0) {
    return "";
  }

  const lines = ["입력 이미지 역할:"];
  named.forEach((label, offset) => {
    const index = offset + 1;
    const adult = isMomOrDadCastLabel(label);
    lines.push(
      adult
        ? `${index}번: ${label}의 초상화입니다. 얼굴은 ${index}번과 같게 유지하세요. 몸과 키는 어른이어도 됩니다.`
        : `${index}번: ${label}의 초상화입니다. 얼굴·헤어·의상은 ${index}번을 따르세요.`,
    );
  });
  lines.push(
    "각 초상화의 얼굴을 다른 사람으로 바꾸거나 일반적인 동화 얼굴로 평균화하지 마세요.",
    named.length > 1 ? "등장인물이 여럿이면 얼굴을 섞지 마세요." : "",
    extraCastFaceRule(named.some((label) => isMomOrDadCastLabel(label))),
  );
  return lines.filter(Boolean).join("\n");
}

/** 변환된 초상화만으로는 장면이 수채화 동화로 미끄러지지 않게, 그림체 이름을 고정한다. */
export function artStyleSceneHint(artStyleKey: string | null | undefined): string {
  switch (artStyleKey) {
    case "basic":
      return "그림체는 입력 캐릭터 그대로입니다. 수채화·색연필·유화·플랫 디지털로 다시 그리지 마세요.";
    case "watercolor":
      return "그림체는 수채화입니다. 물감이 번지고 종이 질감이 보여야 합니다. 디지털처럼 단색으로 매끈하게 칠하지 마세요.";
    case "crayon":
      return "그림체는 색연필입니다. 연필 결과 손으로 칠한 선이 보여야 합니다. 수채화처럼 번지지 마세요.";
    case "flat-digital":
      return "그림체는 플랫 디지털입니다. 단색 면, 또렷한 가장자리, 단순한 그림자만 쓰세요. 수채화 번짐, 종이 질감, 유화 브러시는 금지입니다.";
    case "oil-painting":
      return "그림체는 유화입니다. 두꺼운 붓터치와 유분 질감이 보여야 합니다. 수채화처럼 묽게 번지지 마세요.";
    default:
      return "";
  }
}

export function buildSceneStyleReferenceRole(options: {
  imageIndex: number;
  styleLabel: string;
  styleKey?: string | null;
}): string {
  const hint = artStyleSceneHint(options.styleKey);
  return [
    `${options.imageIndex}번: ${options.styleLabel} 그림체 레퍼런스입니다.`,
    `선, 채색, 질감, 색감을 ${options.imageIndex}번과 같게 장면 전체(배경 포함)에 적용하세요.`,
    `${options.imageIndex}번 속 인물의 얼굴, 헤어, 의상, 구도, 동물은 절대 가져오지 마세요.`,
    hint,
  ]
    .filter(Boolean)
    .join("\n");
}

export type BirthdayPage = {
  pageNumber: number;
  pageType: "COVER" | "PAGE";
  printRange?: string;
  title?: string;
  cast: BirthdayCast;
  story: string;
  illustration: string;
};

/** 이 책에만 붙는 세계관. 다른 동화책 프롬프트에는 넣지 않는다. */
export const FOREST_BIRTHDAY_WORLD_HINT = [
  "이 그림은 숲속 생일파티 이야기의 한 장면입니다.",
  "같은 책처럼 숲의 분위기, 오두막, 파티 장소, 풍선, 선물상자, 공, 케이크 디자인을 이어 주세요.",
  "{{answer.favorite_animal}}이 나오는 장면에서는 항상 같은 모습의 같은 동물로 그리세요.",
  "이 장면에 필요 없는 인물, 동물, 소품은 억지로 넣지 마세요.",
].join(" ");

export const BIRTHDAY_PAGES: BirthdayPage[] = [
  {
    pageNumber: 1,
    pageType: "COVER",
    title: "표지",
    cast: "hero",
    story: "두근두근 생일 파티",
    illustration: [
      "정사각형 표지. 숲속의 따뜻하고 아기자기한 생일파티 공간.",
      "{{character_1}}가 가운데 있다.",
      "주변에는 나무, 풀, 작은 꽃이 있고, 풍선, 케이크, 선물상자가 자연스럽게 어우러진다.",
      "곁에는 좋아하는 동물 {{answer.favorite_animal}}이(가) 있다.",
      "좋아하는 색깔 {{answer.favorite_color}}은 풍선, 리본, 파티 장식의 포인트 컬러로만 쓴다.",
      "엄마, 아빠, 다른 사람은 넣지 마세요.",
      "그림 안에 제목, 글자, 글씨를 넣지 마세요.",
    ].join(" "),
  },
  {
    pageNumber: 2,
    pageType: "PAGE",
    printRange: "1~2P",
    title: "특별한 생일 아침",
    cast: "extraOptional",
    story: [
      "햇님이 반짝반짝!",
      "",
      "{{character_1}}가",
      "쏘옥, 일어났어요.",
      "",
      "{{character_2}}가 말했어요.",
      "",
      "“우리 {{character_1}}, 생일 축하해!”",
      "",
      "두근두근!",
      "오늘은 신나는 생일이에요.",
    ].join("\n"),
    illustration: [
      "숲속 오두막의 아늑한 아이 방.",
      "따뜻한 아침 햇살이 창문으로 들어오고, 창밖으로 푸른 숲이 보인다.",
      "{{character_1}}가 침대에서 막 일어난다.",
      "방 한쪽에 작은 풍선이나 생일 장식이 있어 오늘이 특별한 날임을 보여 준다.",
      "입력 이미지에 두 번째 사람이 있으면 그 사람이 침대 근처나 방문에서 주인공을 따뜻하게 바라본다.",
      "두 번째 사람이 없으면 주인공만 그리고 다른 사람은 넣지 마세요.",
      "좋아하는 동물은 넣지 마세요.",
    ].join(" "),
  },
  {
    pageNumber: 3,
    pageType: "PAGE",
    printRange: "3~4P",
    title: "숲속 생일파티 준비",
    cast: "extraOptional",
    story: [
      "풍선을 둥실둥실~",
      "",
      "리본을 살랑살랑~",
      "",
      "{{character_1}}와 {{character_2}}가",
      "예쁘게 꾸며요.",
      "",
      "알록달록!",
      "파티 준비 끝!",
    ].join("\n"),
    illustration: [
      "숲속의 작은 파티 공간을 꾸미는 장면.",
      "나무 사이에 리본과 풍선을 달고 작은 테이블을 준비한다.",
      "숲과 생일파티가 자연스럽게 어우러진다.",
      "좋아하는 색깔 {{answer.favorite_color}} 풍선과 리본이 대표적인 포인트 컬러다.",
      "{{character_1}}가 꾸미고 있다.",
      "입력 이미지에 두 번째 사람이 있으면 풍선을 건네거나 장식을 돕는다.",
      "두 번째 사람이 없으면 주인공만 그리고 다른 사람은 넣지 마세요.",
      "좋아하는 동물은 넣지 마세요.",
    ].join(" "),
  },
  {
    pageNumber: 4,
    pageType: "PAGE",
    printRange: "5~6P",
    title: "숲속 친구가 찾아왔어요",
    cast: "hero",
    story: [
      "똑똑똑!",
      "",
      "누가 왔을까요?",
      "",
      "깡충깡충!",
      "친구가 왔어요!",
      "",
      "“안녕!”",
      "",
      "{{character_1}}가",
      "반갑게 맞아 주었어요.",
    ].join("\n"),
    illustration: [
      "숲길을 따라 반가운 동물 친구가 찾아오는 장면.",
      "좋아하는 동물 {{answer.favorite_animal}}이(가) 생일파티에 온다.",
      "동물은 선물을 들거나, 집거나, 입에 물지 마세요. 손·발·입으로 상자를 잡지 마세요.",
      "작은 선물상자는 동물 앞 땅이나 풀 위에 놓여 있다.",
      "{{character_1}}가 반갑게 맞이한다.",
      "동물의 특징에 맞는 자연스러운 움직임으로 그린다. 토끼라면 숲길을 깡충깡충 뛰어오고, 다른 동물도 그 동물답게 움직인다.",
      "엄마, 아빠, 다른 사람은 넣지 마세요.",
    ].join(" "),
  },
  {
    pageNumber: 5,
    pageType: "PAGE",
    printRange: "7~8P",
    title: "숲속 친구의 선물",
    cast: "none",
    story: [
      "예쁜 선물상자가 있어요.",
      "",
      "무엇이 들어 있을까요?",
      "",
      "리본을 스르륵~",
      "",
      "상자를 열면……",
      "",
      "짜잔!",
      "",
      "동글동글 공이에요!",
    ].join("\n"),
    illustration: [
      "인물보다 선물 자체를 강조한다.",
      "사람을 전혀 그리지 마세요. 얼굴, 손, 아이, 어른도 넣지 마세요.",
      "좋아하는 동물 캐릭터도 넣지 마세요.",
      "나무 테이블이나 숲속 잔디 위에 예쁜 선물상자가 있다.",
      "리본은 좋아하는 색깔 {{answer.favorite_color}}이다.",
      "상자가 열리며 안에서 같은 색깔의 공이 살짝 보인다.",
      "다음 장면에서 이 공으로 놀이가 이어진다.",
    ].join(" "),
  },
  {
    pageNumber: 6,
    pageType: "PAGE",
    printRange: "9~10P",
    title: "숲속에서 데굴데굴 공놀이",
    cast: "hero",
    story: [
      "공이 데굴데굴~",
      "",
      "통통! 통통!",
      "",
      "친구에게 데굴~",
      "",
      "{{character_1}}에게 데굴~",
      "",
      "“잡았다!”",
      "",
      "하하하!",
      "신나는 공놀이!",
    ].join("\n"),
    illustration: [
      "숲속 잔디에서 {{character_1}}와 {{answer.favorite_animal}}이(가) 함께 공을 굴리며 논다.",
      "공의 색깔은 좋아하는 색깔 {{answer.favorite_color}}이다.",
      "{{character_1}}를 앞쪽에 크게 그린다. 얼굴이 이목구비가 읽힐 만큼 보여야 한다.",
      "멀리 뛰는 작은 실루엣이나 전경만 넓은 풍경으로 그리지 마세요.",
      "밝고 활동적인 장면이다.",
      "엄마, 아빠, 다른 사람은 넣지 마세요.",
    ].join(" "),
  },
  {
    pageNumber: 7,
    pageType: "PAGE",
    printRange: "11~12P",
    title: "숲속 생일 케이크",
    cast: "none",
    story: [
      "어디선가",
      "",
      "달콤한 냄새가",
      "솔솔솔~",
      "",
      "짜잔!",
      "",
      "커다란 케이크예요.",
      "",
      "촛불도",
      "반짝반짝!",
    ].join("\n"),
    illustration: [
      "숲속 파티 테이블 한가운데에 생일 케이크가 크게 보인다. 케이크가 장면의 주인공이다.",
      "사람을 전혀 그리지 마세요. 얼굴, 손, 아이, 어른은 넣지 마세요.",
      "케이크 주변에 동물 친구들이 모여 축하하는 장면이다.",
      "반드시 이 여섯 마리가 모두 나온다: 토끼, 곰, 강아지, 고양이, 코끼리, 기린.",
      "실제 동물처럼 사실적으로 그리지 말고, 이 책과 같은 그림체로 그린다.",
      "박수를 치거나 웃거나 케이크를 바라보며 축하한다.",
      "{{answer.favorite_animal}}은 같은 그림체로, 케이크에 조금 더 가까이 있어도 된다.",
      "케이크에는 촛불이 켜져 있다.",
      "주변에는 풍선, 작은 꽃, 선물, 파티 장식이 숲과 어우러진다.",
      "HAPPY BIRTHDAY 같은 짧은 장식 문구는 허용한다. 그 외 긴 글자는 넣지 마세요.",
    ].join(" "),
  },
  {
    pageNumber: 8,
    pageType: "PAGE",
    printRange: "13~14P",
    title: "후우! 생일 축하해",
    cast: "extraOptional",
    story: [
      "촛불이 반짝반짝!",
      "",
      "{{character_1}}가",
      "후우우~!",
      "",
      "촛불이 쏙!",
      "",
      "짝짝짝!",
      "",
      "{{character_2}}와 친구가 외쳤어요.",
      "",
      "“{{character_1}}, 생일 축하해!”",
    ].join("\n"),
    illustration: [
      "{{character_1}}가 숲속 파티 테이블 앞에서 생일 케이크 촛불을 후우 불어 끄는 순간이다.",
      "{{character_1}}를 앞쪽에 크게 그린다. 촛불을 부는 표정이어도 이목구비는 초상화와 같게 둔다.",
      "좋아하는 동물 {{answer.favorite_animal}}이(가) 옆에서 즐겁게 축하한다.",
      "입력 이미지에 두 번째 사람이 있으면 그 사람이 박수를 치며 함께 축하한다.",
      "두 번째 사람이 없으면 주인공과 동물만 그리고 다른 사람은 넣지 마세요.",
      "풍선, 리본, 장식은 뒤에 두고, 주인공 얼굴을 장면의 초점으로 둔다.",
    ].join(" "),
  },
  {
    pageNumber: 9,
    pageType: "PAGE",
    printRange: "15~16P",
    title: "행복한 숲속 생일파티",
    cast: "extraOptional",
    story: [
      "냠냠, 케이크도 먹고!",
      "",
      "하하, 신나게 웃고!",
      "",
      "{{character_1}}의 생일은",
      "즐거움이 가득했어요.",
      "",
      "{{character_2}}가 꼬옥 안아 주었어요.",
      "",
      "“우리 {{character_1}}, 사랑해.”",
      "",
      "행복한 생일이었답니다.",
    ].join("\n"),
    illustration: [
      "생일파티가 끝나가는 따뜻한 마지막 장면.",
      "{{character_1}}가 앞에 크게 있다. 얼굴이 초상화와 분명히 닮아야 한다.",
      "좋아하는 동물 {{answer.favorite_animal}}이(가) 곁에 있다.",
      "입력 이미지에 두 번째 사람이 있으면 그 사람도 곁에 자연스럽게 있다.",
      "두 번째 사람이 없으면 다른 사람은 넣지 마세요.",
      "파티 전체를 멀리 잡은 풍경으로 그리지 마세요. 주인공 얼굴이 이목구비가 읽힐 만큼 보여야 한다.",
      "앞에서 나온 케이크, 선물상자, 좋아하는 색깔 {{answer.favorite_color}} 공, 풍선은 뒤에 자연스럽게 남긴다.",
      "해가 조금씩 저물어가는 따뜻한 숲. 행복하고 포근하게 마무리한다.",
    ].join(" "),
  },
];

export function resolveBirthdayPage(pageNumber: number) {
  return BIRTHDAY_PAGES.find((page) => page.pageNumber === pageNumber) ?? null;
}

/** @deprecated use resolveBirthdayPage */
export function resolveForestBirthdayPage(pageNumber: number) {
  return resolveBirthdayPage(pageNumber);
}

export function birthdayCastCharacterIds(
  allIds: string[],
  cast: BirthdayCast,
) {
  if (cast === "none") {
    return [];
  }
  if (cast === "hero") {
    return allIds.slice(0, 1);
  }
  return allIds.slice(0, 2);
}

export function birthdayCharacterLabels(
  variables: Record<string, string>,
  cast: BirthdayCast,
) {
  if (cast === "none") {
    return [];
  }
  const hero = variables.character_1?.trim() ?? "";
  const extra =
    variables["cast.mom"]?.trim() ||
    variables["cast.dad"]?.trim() ||
    variables.character_2?.trim() ||
    "";
  if (cast === "hero") {
    return hero ? [hero] : [];
  }
  return [hero, extra].filter(Boolean);
}

/** DB/시드용. 장면 원본은 illustration 지시입니다. */
export function forestBirthdayPagesForSeed() {
  return BIRTHDAY_PAGES.map((page) => ({
    pageNumber: page.pageNumber,
    pageType: page.pageType,
    characterSlots:
      page.cast === "none" ? 0 : page.cast === "extraOptional" ? 2 : 1,
    promptTemplate: page.illustration,
    expressionHint: undefined as string | undefined,
  }));
}

/** 표지·1페이지는 얼굴이 커서 닮고, 3페이지부터는 장면이 넓어져 얼굴을 다시 창작한다. */
export const COVER_LIKENESS_LOCK_FROM_PAGE = 3;

export function shouldAttachCoverLikenessLock(options: {
  pageNumber?: number | null;
  hasPeople: boolean;
}) {
  return (
    options.hasPeople &&
    (options.pageNumber ?? 0) >= COVER_LIKENESS_LOCK_FROM_PAGE
  );
}

export function buildCoverLikenessLockPrompt(options: {
  lastImageIndex: number;
  hasExtraCast?: boolean;
}) {
  const last = options.lastImageIndex;
  return [
    `마지막 ${last}번 이미지는 이미 맞게 그린 주인공 표지입니다.`,
    "주인공 얼굴만 이 표지와 초상화에 맞추세요. 표지의 구도, 배경, 소품은 베끼지 마세요.",
    options.hasExtraCast
      ? "표지는 주인공 확인용입니다. 추가 등장인물은 어른으로 그려도 됩니다. 얼굴은 그 사람의 입력 초상화를 따르세요."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildPeoplePageIdentityCloser(
  pageNumber?: number | null,
  characterLabels?: string[],
) {
  const names = (characterLabels ?? [])
    .map((label) => label.trim())
    .filter(Boolean);
  const who = names.length > 1 ? names.join(", ") : names[0] || "주인공";
  const wide = (pageNumber ?? 0) >= 6;
  return [
    `다시 확인: ${who}는 입력 초상화의 그 사람입니다. 비슷한 동화 인물로 바꾸면 실패입니다.`,
    extraCastFaceRule(names.some((name) => isMomOrDadCastLabel(name))),
    wide
      ? names.length > 1
        ? "장면이 넓어도 등장인물을 앞에 크게 두고, 이목구비가 읽힐 만큼 얼굴을 보여 주세요."
        : "장면이 넓어도 주인공을 앞에 크게 두고, 이목구비가 읽힐 만큼 얼굴을 보여 주세요."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildStyledIllustrationPrompt(options: {
  sceneDescription: string;
  expressionHint?: string | null;
  characterLabels?: string[];
  pageType?: "COVER" | "PAGE";
  pageNumber?: number;
  cast?: BirthdayCast;
  worldHint?: string | null;
  artStyleKey?: string | null;
}): string {
  const scene = options.sceneDescription.trim();
  const world = options.worldHint?.trim() || "";
  const expression = options.expressionHint?.trim() || "";
  const labels = (options.characterLabels ?? [])
    .map((label) => label.trim())
    .filter(Boolean);
  const cast = options.cast ?? (labels.length > 0 ? "hero" : "none");
  const keepAndChange = expression
    ? [
        `[변경할 것] 포즈, 배경, 그리고 표정: ${expression}`,
        "표정은 눈과 입의 모양만 바꾸고, 얼굴형·이목구비 비율·볼살은 초상화와 같게 두세요.",
      ]
    : ["[변경할 것] 포즈와 배경만 장면에 맞게 표현. 얼굴과 의상은 바꾸지 마세요."];

  const named = labels.join(", ");
  const isCover = options.pageType === "COVER";
  const keepOriginalStyle = skipsStyleTransfer(options.artStyleKey);
  const extraOptionalNote =
    cast === "extraOptional"
      ? "추가 등장인물(엄마/아빠)은 이 주문에 없습니다. 다른 사람을 넣지 마세요."
      : "";

  let identityIntro: string[];
  if (cast === "none" || labels.length === 0) {
    identityIntro = [
      "입력 이미지가 있으면 그림체 레퍼런스로만 쓰세요. 사람을 그리지 마세요.",
      `다음 장면을 그려주세요: ${scene}`,
    ];
  } else if (keepOriginalStyle) {
    identityIntro = (
      labels.length > 1
        ? [
            `앞쪽 이미지는 등장인물입니다. 등장 순서는 ${named}입니다.`,
            "사람을 다른 사람으로 바꾸거나 얼굴을 섞지 마세요.",
            extraCastFaceRule(labels.some((name) => isMomOrDadCastLabel(name))),
            "각 인물의 얼굴은 해당 초상화와 똑같이 닮아야 합니다. 비슷한 다른 사람이 아니라 같은 사람입니다.",
            `얼굴·헤어·의상·그림체는 초상화 그대로 유지하고 다음 장면을 그려주세요: ${scene}`,
          ]
        : [
            "앞쪽 이미지는 이 장면의 주인공입니다. 다른 사람으로 바꾸지 마세요.",
            extraOptionalNote,
            "얼굴은 초상화와 똑같이 닮아야 합니다. 비슷한 다른 사람이 아니라 같은 사람입니다.",
            `얼굴·헤어·의상·그림체는 초상화 그대로 유지하고 다음 장면을 그려주세요: ${scene}`,
          ]
    ).filter(Boolean);
  } else {
    identityIntro = (
      labels.length > 1
        ? [
            `앞쪽 이미지는 그림체를 입힌 등장인물입니다. 등장 순서는 ${named}입니다.`,
            "사람을 다른 사람으로 바꾸거나 얼굴을 섞지 마세요.",
            extraCastFaceRule(labels.some((name) => isMomOrDadCastLabel(name))),
            "각 인물의 얼굴은 해당 초상화와 똑같이 닮아야 합니다. 비슷한 다른 사람이 아니라 같은 사람입니다.",
            "얼굴·헤어·의상·그림체는 이 초상화를 따르세요. 의상은 바꾸지 마세요.",
            `얼굴 닮은꼴과 의상을 유지한 채 포즈와 배경만 바꿔 다음 장면을 그려주세요: ${scene}`,
          ]
        : [
            "앞쪽 이미지는 그림체를 입힌 주인공입니다. 다른 사람으로 바꾸지 마세요.",
            extraOptionalNote,
            "얼굴은 이 초상화와 똑같이 닮아야 합니다. 비슷한 다른 사람이 아니라 같은 사람입니다.",
            "얼굴·헤어·의상·그림체는 이 초상화를 따르세요. 의상은 바꾸지 마세요.",
            `얼굴 닮은꼴과 의상을 유지한 채 포즈와 배경만 바꿔 다음 장면을 그려주세요: ${scene}`,
          ]
    ).filter(Boolean);
  }

  const wideSceneLine =
    "이미지는 가로로 긴 한 장의 연속 장면(2048x1024)입니다. 책을 펼친 두 쪽으로 나누어 그리지 마세요. 가운데 접힌 선, 제본선, 페이지 구분선, 세로 구분선, 책등, 가운데 여백 띠를 절대 그리지 마세요. 배경과 바닥이 화면 한가운데에서 끊기지 않고 하나로 이어지게 하세요.";
  const sizeLine = isCover
    ? "이미지는 정사각형 표지(1024x1024)입니다. 주인공 얼굴은 초상화와 똑같이 닮게, 가운데에서 분명히 보이게 그리세요."
    : cast === "none" || labels.length === 0
      ? wideSceneLine
      : [
          wideSceneLine,
          labels.length > 1
            ? `${named}의 얼굴은 각 입력 초상화와 같은 얼굴이어야 합니다. 장면이 넓어도 이목구비가 분명히 읽혀야 합니다.`
            : "주인공 얼굴은 입력 초상화와 같은 얼굴이어야 합니다. 장면이 넓어도 이목구비가 분명히 읽혀야 합니다.",
          "멀리 있는 작은 실루엣으로 그리지 말고, 얼굴이 분명히 알아볼 수 있을 만큼 크게 그리세요.",
          "중요한 얼굴은 화면 정중앙에 두지 마세요. 살짝 왼쪽이나 오른쪽에 두되, 작게 만들지 마세요.",
        ].join(" ");

  const styleHint = artStyleSceneHint(options.artStyleKey);
  const avoidDefaultWatercolor =
    options.artStyleKey && options.artStyleKey !== "watercolor"
      ? "일반적인 수채화 그림책 스타일로 바꾸지 마세요."
      : "";

  return [
    ...(world ? [world, ""] : []),
    ...identityIntro,
    "",
    ...(cast === "none"
      ? []
      : [
          "[반드시 유지할 것 — 얼굴]",
          "- 가장 중요: 초상화와 같은 사람. 비슷한 동화 인물로 바꾸면 실패입니다",
          "- 얼굴형, 눈의 크기·간격·모양, 눈썹, 코, 입, 볼살, 턱선, 피부톤을 초상화에서 그대로 복사",
          "- 조금만 달라도 오류입니다. 다시 창작하거나 예쁘게 다듬지 말 것",
          "- 얼굴을 다른 나이의 사람으로 다시 그리지 말 것",
          extraCastFaceRule(labels.some((name) => isMomOrDadCastLabel(name))),
          keepOriginalStyle
            ? "- 얼굴·헤어·의상·그림체는 입력 캐릭터 그대로입니다. 다른 그림체로 다시 그리지 마세요."
            : "- 얼굴·헤어·의상·그림체는 그림체를 입힌 초상화를 따르세요. 닮은꼴과 옷은 그대로 두고, 장면의 그림체도 그 초상화와 같게 하세요.",
          "",
          "[반드시 유지할 것 — 그 외]",
          "- 헤어스타일, 머리색, 의상",
          keepOriginalStyle
            ? "- 그림체는 입력 캐릭터 원본 그대로"
            : "- 그림체는 그림체를 입힌 초상화 그대로. 배경도 같은 그림체로",
          "",
          ...keepAndChange,
          "",
        ]),
    sizeLine,
    "",
    ...(styleHint ? [styleHint, ""] : []),
    ...(avoidDefaultWatercolor ? [avoidDefaultWatercolor, ""] : []),
    "얼굴에 사진 질감이나 광택 렌더링을 넣지 마세요.",
    ...(cast === "none" || labels.length === 0
      ? []
      : ["", buildPeoplePageIdentityCloser(options.pageNumber, labels)]),
  ].join("\n");
}
