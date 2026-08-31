import type { CustomField } from "@/lib/templates";

export const CUSTOM_INPUT_MAX_LENGTH = 20;

export const CUSTOM_INPUT_PROFANITY_ERROR =
  "부적절한 내용이 포함되어 있어요, 다시 입력해주세요";

const PROFANITY_TERMS = [
  "씨발",
  "시발",
  "씨팔",
  "시팔",
  "병신",
  "지랄",
  "좆",
  "존나",
  "꺼져",
  "미친놈",
  "미친년",
];

export function stripTemplateDelimiters(value: string): string {
  return value.replace(/\{\{/g, "").replace(/\}\}/g, "");
}

export function sanitizeCustomInputValue(value: string): string {
  return stripTemplateDelimiters(value).trim();
}

function normalizedForProfanity(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function containsProfanity(value: string): boolean {
  const haystack = normalizedForProfanity(value);
  if (!haystack) {
    return false;
  }
  return PROFANITY_TERMS.some((term) => haystack.includes(term));
}

export function customInputsContainProfanity(
  values: Record<string, string>,
): boolean {
  return Object.values(values).some((value) => containsProfanity(value));
}

export function sanitizeCustomInputRecord(
  values: Record<string, string>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    sanitized[key] = sanitizeCustomInputValue(value);
  }
  return sanitized;
}

export function validateCustomInputValues(
  fields: CustomField[],
  rawValues: Record<string, string>,
): { error: string } | { values: Record<string, string> } {
  const values: Record<string, string> = {};

  for (const field of fields) {
    const required = field.required !== false;
    const sanitized = sanitizeCustomInputValue(rawValues[field.key] ?? "");

    if (required && !sanitized) {
      return { error: `${field.label}을(를) 입력해 주세요.` };
    }

    if (sanitized.length > CUSTOM_INPUT_MAX_LENGTH) {
      return {
        error: `${field.label}은(는) ${CUSTOM_INPUT_MAX_LENGTH}자 이내로 입력해 주세요.`,
      };
    }

    if (containsProfanity(sanitized)) {
      return { error: CUSTOM_INPUT_PROFANITY_ERROR };
    }

    values[field.key] = sanitized;
  }

  return { values };
}
