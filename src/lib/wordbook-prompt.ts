/**
 * 단어 그림책 캐릭터 표정.
 * 기본 표정은 저장된 캐릭터 이미지를 그대로 쓰고, 나머지 2개만 GPT로 그린다.
 * 판바기 테스트에서 짧은 한국어 자연어 프롬프트가 딱딱한 영어 지시보다 결과가 좋아서 한국어로 쓴다.
 */

export type WordbookExpression = "curious" | "surprised";

export const WORDBOOK_GENERATED_EXPRESSIONS: WordbookExpression[] = [
  "curious",
  "surprised",
];

export const WORDBOOK_EXPRESSION_INFO: Record<
  "base" | WordbookExpression,
  { label: string; usage: string }
> = {
  base: {
    label: "기본 표정",
    usage: "시작 화면, 단어 소개, 결과 화면",
  },
  curious: {
    label: "궁금한 표정",
    usage: "문제를 낼 때, 틀렸을 때 \"다시 볼까?\"",
  },
  surprised: {
    label: "놀란 표정",
    usage: "정답 순간 \"우와!\", 깜짝 장면",
  },
};

const SHARED_RULES = `첨부한 캐릭터 그림을 그대로 다시 그려 주세요.
같은 아이, 같은 그림체, 같은 머리 모양과 옷, 같은 구도와 크기, 같은 배경으로 그리고 얼굴 표정만 바꿔 주세요.
얼굴 생김새(눈매, 코, 얼굴형, 피부색)는 바꾸지 마세요.
글자, 물음표, 느낌표, 말풍선, 효과선은 넣지 마세요.`;

const EXPRESSION_LINES: Record<WordbookExpression, string> = {
  curious:
    "표정: 무언가 궁금해하는 얼굴. 눈을 동그랗게 뜨고 고개를 살짝 한쪽으로 갸웃하며, 입은 작게 오므린 모습.",
  surprised:
    "표정: 기분 좋게 깜짝 놀란 얼굴. 눈을 크게 뜨고 눈썹을 올리고, 입을 동그랗게 벌린 모습. 무섭거나 슬퍼 보이지 않게.",
};

export function buildWordbookExpressionPrompt(expression: WordbookExpression) {
  return `${SHARED_RULES}\n\n${EXPRESSION_LINES[expression]}`;
}

export function parseWordbookExpression(
  value: unknown,
): WordbookExpression | null {
  return value === "curious" || value === "surprised" ? value : null;
}
