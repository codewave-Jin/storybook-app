import { substitutePromptTemplate } from "@/lib/illustration-prompt";
import type { HeroAgeRangeKey } from "@/lib/templates";

export type StoryCopyVariant = {
  withExtra: string;
  solo: string;
};

export type AgeStoryCopy = Record<number, StoryCopyVariant>;

const AGE_1_2: AgeStoryCopy = {
  2: {
    withExtra: [
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
    solo: [
      "햇님이 반짝반짝!",
      "",
      "{{character_1}}가",
      "쏘옥, 일어났어요.",
      "",
      "두근두근!",
      "오늘은 신나는 생일이에요.",
    ].join("\n"),
  },
  3: {
    withExtra: [
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
    solo: [
      "풍선을 둥실둥실~",
      "",
      "리본을 살랑살랑~",
      "",
      "{{character_1}}가",
      "예쁘게 꾸며요.",
      "",
      "알록달록!",
      "파티 준비 끝!",
    ].join("\n"),
  },
  4: {
    withExtra: [
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
    solo: [
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
  },
  5: {
    withExtra: [
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
    solo: [
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
  },
  6: {
    withExtra: [
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
    solo: [
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
  },
  7: {
    withExtra: [
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
    solo: [
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
  },
  8: {
    withExtra: [
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
    solo: [
      "촛불이 반짝반짝!",
      "",
      "{{character_1}}가",
      "후우우~!",
      "",
      "촛불이 쏙!",
      "",
      "짝짝짝!",
      "",
      "친구가 외쳤어요.",
      "",
      "“{{character_1}}, 생일 축하해!”",
    ].join("\n"),
  },
  9: {
    withExtra: [
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
    solo: [
      "냠냠, 케이크도 먹고!",
      "",
      "하하, 신나게 웃고!",
      "",
      "{{character_1}}의 생일은",
      "즐거움이 가득했어요.",
      "",
      "행복한 생일이었답니다.",
    ].join("\n"),
  },
};

const AGE_2_3_SHARED = {
  4: [
    "그때였어요.",
    "",
    "숲길에서",
    "사박사박 소리가 들려왔어요.",
    "",
    "“누구지?”",
    "",
    "반가운 동물 친구가",
    "{{character_1}}를 찾아왔어요!",
    "",
    "“어서 와! 기다리고 있었어!”",
    "",
    "친구 앞에는",
    "작은 선물상자도 있었어요.",
  ].join("\n"),
  5: [
    "예쁜 리본이 묶인",
    "선물상자 하나.",
    "",
    "상자 안에는",
    "무엇이 들어 있을까요?",
    "",
    "리본을 스르륵 풀고",
    "상자를 살짝 열어 보니……",
    "",
    "“짜잔!”",
    "",
    "동글동글 예쁜 공이 나타났어요!",
  ].join("\n"),
  6: [
    "{{character_1}}와 친구는",
    "선물 받은 공을 가지고 놀았어요.",
    "",
    "데굴데굴~",
    "친구에게 공을 굴리고,",
    "",
    "통통통~",
    "다시 {{character_1}}에게!",
    "",
    "“잡았다!”",
    "",
    "숲속에 신나는 웃음소리가",
    "가득 퍼졌어요.",
  ].join("\n"),
  7: [
    "한참 신나게 놀고 있는데",
    "어디선가 달콤한 냄새가 났어요.",
    "",
    "“킁킁, 무슨 냄새지?”",
    "",
    "짜잔!",
    "",
    "파티 테이블 위에는",
    "커다란 생일 케이크가 있었어요.",
    "",
    "동물 친구들도",
    "케이크 주위에 모였어요.",
    "",
    "촛불이 반짝반짝 빛났어요.",
  ].join("\n"),
};

const AGE_3_4: AgeStoryCopy = {
  2: {
    withExtra: [
      "따뜻한 아침 햇살이",
      "창문으로 살며시 들어왔어요.",
      "",
      "{{character_1}}가 눈을 뜨자",
      "알록달록 풍선이 보였어요.",
      "",
      "{{character_2}}가 웃으며 말했어요.",
      "",
      "“{{character_1}}, 생일 축하해!”",
      "",
      "“와! 오늘은 내 생일이다!”",
      "",
      "{{character_1}}의 마음이",
      "두근두근 설레기 시작했어요.",
    ].join("\n"),
    solo: [
      "따뜻한 아침 햇살이",
      "창문으로 살며시 들어왔어요.",
      "",
      "{{character_1}}가 눈을 뜨자",
      "알록달록 풍선이 보였어요.",
      "",
      "“아, 맞다! 오늘은 내 생일이지!”",
      "",
      "{{character_1}}의 마음이",
      "두근두근 설레기 시작했어요.",
    ].join("\n"),
  },
  3: {
    withExtra: [
      "{{character_1}}와 {{character_2}}는",
      "숲으로 나가 파티를 준비했어요.",
      "",
      "풍선을 둥실둥실 달고,",
      "리본도 살랑살랑 매달았어요.",
      "",
      "“여기에도 하나 달아 볼까?”",
      "",
      "“좋아요!”",
      "",
      "둘이 함께 꾸미니",
      "멋진 파티 장소가 완성되었어요!",
    ].join("\n"),
    solo: [
      "{{character_1}}는 숲으로 나가",
      "생일파티를 준비했어요.",
      "",
      "풍선을 둥실둥실 달고,",
      "리본도 살랑살랑 매달았어요.",
      "",
      "“친구들이 좋아하겠지?”",
      "",
      "알록달록 예쁜",
      "파티 준비가 끝났어요!",
    ].join("\n"),
  },
  4: {
    withExtra: AGE_2_3_SHARED[4],
    solo: AGE_2_3_SHARED[4],
  },
  5: {
    withExtra: AGE_2_3_SHARED[5],
    solo: AGE_2_3_SHARED[5],
  },
  6: {
    withExtra: AGE_2_3_SHARED[6],
    solo: AGE_2_3_SHARED[6],
  },
  7: {
    withExtra: AGE_2_3_SHARED[7],
    solo: AGE_2_3_SHARED[7],
  },
  8: {
    withExtra: [
      "{{character_1}}가",
      "케이크 앞에 섰어요.",
      "",
      "{{character_2}}가 말했어요.",
      "",
      "“소원을 빌어 볼까?”",
      "",
      "{{character_1}}는 두 눈을 꼭 감고",
      "마음속으로 소원을 빌었어요.",
      "",
      "“하나, 둘, 셋!”",
      "",
      "“후우우~!”",
      "",
      "촛불이 쏙 꺼지자",
      "{{character_2}}와 동물 친구들이 축하했어요.",
      "",
      "“{{character_1}}, 생일 축하해!”",
    ].join("\n"),
    solo: [
      "{{character_1}}가",
      "케이크 앞에 섰어요.",
      "",
      "두 눈을 꼭 감고",
      "마음속으로 소원을 빌었어요.",
      "",
      "“하나, 둘, 셋!”",
      "",
      "“후우우~!”",
      "",
      "촛불이 쏙 꺼지자",
      "동물 친구들이 신나게 축하했어요.",
      "",
      "“{{character_1}}, 생일 축하해!”",
    ].join("\n"),
  },
  9: {
    withExtra: [
      "달콤한 케이크도 냠냠!",
      "",
      "친구들과 함께 하하하!",
      "",
      "어느새 숲에는",
      "따뜻한 저녁빛이 내려앉았어요.",
      "",
      "{{character_1}}가 활짝 웃으며 말했어요.",
      "",
      "“오늘 정말 즐거웠어요!”",
      "",
      "{{character_2}}도 환하게 웃었어요.",
      "",
      "친구들과 함께한 특별한 생일은",
      "{{character_1}}의 행복한 추억이 되었답니다.",
    ].join("\n"),
    solo: [
      "달콤한 케이크도 냠냠!",
      "",
      "친구들과 함께 하하하!",
      "",
      "어느새 숲에는",
      "따뜻한 저녁빛이 내려앉았어요.",
      "",
      "{{character_1}}는 오늘 하루를 떠올리며",
      "활짝 웃었어요.",
      "",
      "“오늘 정말 즐거웠어!”",
      "",
      "두근두근 기다렸던 생일은",
      "행복한 추억이 되었답니다.",
    ].join("\n"),
  },
};

const AGE_5_7_SHARED = {
  4: [
    "그때 숲길에서",
    "사박사박, 작은 소리가 들려왔어요.",
    "",
    "{{character_1}}는 귀를 쫑긋 세우고",
    "숲길을 바라보았어요.",
    "",
    "“누가 오는 걸까?”",
    "",
    "잠시 뒤, 기다리던 동물 친구가 나타났어요.",
    "친구 앞에는 작은 선물상자도 놓여 있었지요.",
    "",
    "“어서 와! 정말 기다렸어!”",
    "",
    "드디어 즐거운 생일파티가 시작되었어요.",
  ].join("\n"),
  5: [
    "예쁜 리본이 묶인 선물상자.",
    "",
    "과연 무엇이 들어 있을까요?",
    "",
    "리본이 스르륵 풀리고",
    "상자가 천천히 열렸어요.",
    "",
    "그리고 그 안에서 보인 것은……",
    "",
    "“우와!”",
    "",
    "동글동글 예쁜 공이었어요.",
    "",
    "친구와 함께 놀 수 있는",
    "아주 멋진 선물이었지요.",
  ].join("\n"),
  6: [
    "{{character_1}}와 친구는",
    "곧바로 공을 가지고 숲속 잔디로 달려갔어요.",
    "",
    "데굴데굴~",
    "{{character_1}}가 공을 굴리면 친구가 쫓아가고,",
    "",
    "통통통~",
    "이번에는 공이 {{character_1}}에게 돌아왔어요.",
    "",
    "“이번엔 내가 잡을 거야!”",
    "",
    "공이 이쪽저쪽으로 움직일 때마다",
    "웃음소리도 숲속 가득 퍼졌어요.",
    "",
    "혼자 놀 때보다 친구와 함께하니",
    "훨씬 더 신났답니다.",
  ].join("\n"),
  7: [
    "신나게 놀고 있는데",
    "어디선가 달콤한 냄새가 솔솔 풍겨 왔어요.",
    "",
    "“어디에서 나는 냄새지?”",
    "",
    "파티 테이블에는 어느새",
    "커다란 생일 케이크가 놓여 있었어요.",
    "",
    "동물 친구들도 하나둘 케이크 주위로 모였지요.",
    "",
    "케이크 위에서는 촛불이",
    "반짝반짝 빛나고 있었어요.",
    "",
    "이제 모두가 기다리던",
    "생일 축하 시간이에요!",
  ].join("\n"),
};

const AGE_5_7: AgeStoryCopy = {
  2: {
    withExtra: [
      "따뜻한 아침 햇살이",
      "숲속 오두막의 창문으로 들어왔어요.",
      "",
      "잠에서 깬 {{character_1}}는",
      "방 안에 놓인 알록달록한 풍선을 발견했어요.",
      "",
      "그때 {{character_2}}가 다가와 환하게 웃었어요.",
      "",
      "“{{character_1}}, 생일 축하해!”",
      "",
      "“고마워요! 오늘 친구들도 오는 거죠?”",
      "",
      "어떤 친구들이 찾아올까요?",
      "오늘은 어떤 일이 기다리고 있을까요?",
      "",
      "{{character_1}}의 마음은",
      "벌써부터 두근두근 설레었어요.",
    ].join("\n"),
    solo: [
      "따뜻한 아침 햇살이",
      "숲속 오두막의 창문으로 들어왔어요.",
      "",
      "잠에서 깬 {{character_1}}는",
      "방 안에 놓인 알록달록한 풍선을 발견했어요.",
      "",
      "“아, 맞다! 오늘은 내 생일이야!”",
      "",
      "어떤 친구들이 찾아올까요?",
      "오늘은 어떤 일이 기다리고 있을까요?",
      "",
      "생각만 해도 {{character_1}}의 마음은",
      "두근두근 설레었어요.",
    ].join("\n"),
  },
  3: {
    withExtra: [
      "{{character_1}}와 {{character_2}}는",
      "숲속 파티 장소를 꾸미기 시작했어요.",
      "",
      "나무 사이에는 풍선을 달고,",
      "살랑살랑 흔들리는 리본도 매달았지요.",
      "",
      "“이 풍선은 어디에 달까요?”",
      "",
      "“저쪽 나무에 달면 예쁘겠구나.”",
      "",
      "둘은 힘을 합쳐 하나씩 장식을 완성했어요.",
      "",
      "마지막 풍선까지 달고 나니",
      "숲속에 멋진 생일파티 장소가 완성되었어요.",
      "",
      "이제 친구들을 기다릴 시간이에요!",
    ].join("\n"),
    solo: [
      "{{character_1}}는 신나는 마음으로",
      "숲속 파티 장소를 꾸미기 시작했어요.",
      "",
      "나무 사이에는 풍선을 달고,",
      "살랑살랑 흔들리는 리본도 매달았지요.",
      "",
      "“친구들이 오면 깜짝 놀라겠지?”",
      "",
      "마지막 풍선까지 달고 나니",
      "숲속에 멋진 생일파티 장소가 완성되었어요.",
      "",
      "이제 친구들을 기다릴 시간이에요!",
    ].join("\n"),
  },
  4: {
    withExtra: AGE_5_7_SHARED[4],
    solo: AGE_5_7_SHARED[4],
  },
  5: {
    withExtra: AGE_5_7_SHARED[5],
    solo: AGE_5_7_SHARED[5],
  },
  6: {
    withExtra: AGE_5_7_SHARED[6],
    solo: AGE_5_7_SHARED[6],
  },
  7: {
    withExtra: AGE_5_7_SHARED[7],
    solo: AGE_5_7_SHARED[7],
  },
  8: {
    withExtra: [
      "{{character_1}}는",
      "반짝이는 촛불 앞에 섰어요.",
      "",
      "{{character_2}}가 다정하게 말했어요.",
      "",
      "“눈을 감고 소원을 빌어 보렴.”",
      "",
      "{{character_1}}는 두 눈을 꼭 감고",
      "마음속으로 소원을 생각했어요.",
      "",
      "그리고 모두 함께 외쳤어요.",
      "",
      "“하나, 둘, 셋!”",
      "",
      "“후우우우~!”",
      "",
      "촛불이 모두 꺼지자",
      "{{character_2}}와 동물 친구들이 박수를 쳤어요.",
      "",
      "“{{character_1}}, 생일 축하해!”",
      "",
      "{{character_1}}의 얼굴에도",
      "환한 웃음이 번졌답니다.",
    ].join("\n"),
    solo: [
      "{{character_1}}는",
      "반짝이는 촛불 앞에 섰어요.",
      "",
      "그리고 두 눈을 꼭 감았어요.",
      "",
      "‘어떤 소원을 빌까?’",
      "",
      "잠시 마음속으로 소원을 생각한 뒤,",
      "",
      "“하나, 둘, 셋!”",
      "",
      "“후우우우~!”",
      "",
      "촛불이 모두 꺼졌어요.",
      "",
      "동물 친구들이 신나게 축하했어요.",
      "",
      "“{{character_1}}, 생일 축하해!”",
      "",
      "{{character_1}}의 얼굴에도",
      "환한 웃음이 번졌답니다.",
    ].join("\n"),
  },
  9: {
    withExtra: [
      "어느새 해가 저물고",
      "숲에는 따뜻한 저녁빛이 내려앉았어요.",
      "",
      "오늘은 친구와 공놀이도 하고,",
      "맛있는 케이크도 먹고,",
      "다 함께 실컷 웃었어요.",
      "",
      "{{character_1}}가 {{character_2}}에게 말했어요.",
      "",
      "“오늘 정말 행복했어요!”",
      "",
      "{{character_2}}도 미소 지으며 대답했어요.",
      "",
      "“함께해서 더 즐거운 생일이었구나.”",
      "",
      "{{character_1}}는 곁에 있는 친구들을 바라보며",
      "오늘 하루를 다시 떠올렸어요.",
      "",
      "기다리던 생일은 끝나가고 있었지만",
      "함께한 즐거운 순간들은 마음속에 오래 남았어요.",
      "",
      "{{character_1}}에게 또 하나의",
      "소중한 추억이 생긴 날이었답니다.",
    ].join("\n"),
    solo: [
      "어느새 해가 저물고",
      "숲에는 따뜻한 저녁빛이 내려앉았어요.",
      "",
      "오늘은 함께 공놀이도 하고,",
      "맛있는 케이크도 먹고,",
      "친구들과 실컷 웃었어요.",
      "",
      "{{character_1}}는 오늘 있었던 일을 떠올리며 말했어요.",
      "",
      "“친구들과 함께해서 정말 행복했어.”",
      "",
      "기다리던 생일은 끝나가고 있었지만",
      "즐거웠던 순간들은 마음속에 오래 남았어요.",
      "",
      "{{character_1}}에게 또 하나의",
      "소중한 추억이 생긴 날이었답니다.",
    ].join("\n"),
  },
};

const STORIES: Record<HeroAgeRangeKey, AgeStoryCopy | null> = {
  AGE_1_2,
  AGE_3_4,
  AGE_5_7,
};

function isHeroAgeRangeKey(value: string): value is HeroAgeRangeKey {
  return value === "AGE_1_2" || value === "AGE_3_4" || value === "AGE_5_7";
}

export function resolveAgeStoryCopy(
  ageKey: string | null | undefined,
): AgeStoryCopy {
  if (ageKey && isHeroAgeRangeKey(ageKey) && STORIES[ageKey]) {
    return STORIES[ageKey] as AgeStoryCopy;
  }
  return AGE_1_2;
}

export function resolveStoryCopyTemplate(options: {
  pageNumber: number;
  ageKey?: string | null;
  hasExtra: boolean;
}): string | null {
  const variant = resolveAgeStoryCopy(options.ageKey)[options.pageNumber];
  if (!variant) {
    return null;
  }
  return options.hasExtra ? variant.withExtra : variant.solo;
}

export function storyCopyLines(template: string): string[] {
  return template
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function resolveStoryCopyLines(options: {
  pageNumber: number;
  pageType?: string | null;
  ageKey?: string | null;
  hasExtra: boolean;
  variables: Record<string, string>;
}): string[] {
  if (options.pageType === "COVER" || options.pageNumber <= 1) {
    return [];
  }

  const template = resolveStoryCopyTemplate({
    pageNumber: options.pageNumber,
    ageKey: options.ageKey,
    hasExtra: options.hasExtra,
  });
  if (!template) {
    return [];
  }

  return storyCopyLines(substitutePromptTemplate(template, options.variables));
}

export function resolveStoryCopyText(options: {
  pageNumber: number;
  pageType?: string | null;
  ageKey?: string | null;
  hasExtra: boolean;
  variables: Record<string, string>;
}): string {
  return resolveStoryCopyLines(options).join("\n");
}

export function resolveFinalStoryText(
  savedText: string | null | undefined,
  fallback: string,
) {
  const saved = savedText?.trim();
  return saved ? savedText!.replace(/\r\n/g, "\n") : fallback;
}

export function storyPageLabel(options: {
  pageNumber: number;
  pageType?: string | null;
}) {
  if (options.pageType === "COVER" || options.pageNumber <= 1) {
    return "표지";
  }
  return `${options.pageNumber}페이지`;
}

export function formatStoryTextExport(
  pages: Array<{ label: string; text: string }>,
) {
  return pages
    .filter((page) => page.text.trim())
    .map((page) => `${page.label}\n${page.text}`)
    .join("\n\n-----\n\n");
}
