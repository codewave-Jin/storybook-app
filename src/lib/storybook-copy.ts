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

const STORIES: Record<HeroAgeRangeKey, AgeStoryCopy | null> = {
  AGE_1_2,
  AGE_3_4: null,
  AGE_5_7: null,
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
