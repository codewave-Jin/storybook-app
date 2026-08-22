export const EXPRESSION_OPTIONS = [
  { value: "default", label: "기본", hint: "원본 표정 유지" },
  { value: "smile", label: "웃음", hint: "활짝 웃는 표정" },
  { value: "surprise", label: "놀람", hint: "" },
  { value: "serious", label: "진지함 / 집중", hint: "" },
  { value: "sad", label: "슬픔", hint: "" },
  { value: "excited", label: "신남 / 들뜬 표정", hint: "" },
] as const;

export type ExpressionValue = (typeof EXPRESSION_OPTIONS)[number]["value"];

export const DEFAULT_EXPRESSION: ExpressionValue = "default";

const EXPRESSION_VALUES = new Set<string>(
  EXPRESSION_OPTIONS.map((option) => option.value),
);

export function parseExpression(value: unknown): ExpressionValue {
  if (typeof value === "string" && EXPRESSION_VALUES.has(value)) {
    return value as ExpressionValue;
  }
  return DEFAULT_EXPRESSION;
}

export function expressionInstructionLabel(value: ExpressionValue) {
  const option = EXPRESSION_OPTIONS.find((item) => item.value === value);
  if (!option || option.value === "default") {
    return null;
  }
  return option.hint ? `${option.label} (${option.hint})` : option.label;
}
