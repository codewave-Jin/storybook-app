export const STICKER_PHRASE_OPTIONS = [
  {
    key: "phrase1",
    label: "문구1",
    text: "생 일",
  },
  {
    key: "phrase2",
    label: "문구2",
    text: "아이의 생일을\n축하해주셔서 \n감사합니다",
  },
] as const;

export type StickerPhraseKey = (typeof STICKER_PHRASE_OPTIONS)[number]["key"];

export const MAX_STICKER_PHRASE_LENGTH = 60;
export const PHRASE_SLOT_SEPARATOR = "\u001e";

export type StickerPhraseParts = {
  phrase1: string;
  phrase2: string;
  phrase3?: string;
};

export function defaultStickerPhraseTexts(): Record<StickerPhraseKey, string> {
  return {
    phrase1: STICKER_PHRASE_OPTIONS[0].text,
    phrase2: STICKER_PHRASE_OPTIONS[1].text,
  };
}

export function serializeStickerPhrases(texts: string[]) {
  const slots = texts
    .slice(0, 3)
    .map((text) => text.replace(/\r\n/g, "\n").trim());
  while (slots.length > 0 && !slots[slots.length - 1]) {
    slots.pop();
  }
  return slots.join(PHRASE_SLOT_SEPARATOR);
}

export function serializeStickerPhrase(parts: StickerPhraseParts) {
  return serializeStickerPhrases([
    parts.phrase1,
    parts.phrase2,
    parts.phrase3 ?? "",
  ]);
}

export function parseStickerPhrases(phrase: string): string[] {
  const normalized = phrase.replace(/\r\n/g, "\n");
  if (normalized.includes(PHRASE_SLOT_SEPARATOR)) {
    return normalized.split(PHRASE_SLOT_SEPARATOR).slice(0, 3);
  }
  const lines = normalized.split("\n");
  const phrase1 = (lines[0] ?? "").trim();
  const phrase2 = lines.slice(1).join("\n").trim();
  if (!phrase1 && !phrase2) {
    return [];
  }
  return phrase2 ? [phrase1, phrase2] : [phrase1];
}

export function parseStickerPhrase(phrase: string): StickerPhraseParts {
  const texts = parseStickerPhrases(phrase);
  return {
    phrase1: texts[0] ?? "",
    phrase2: texts[1] ?? "",
    phrase3: texts[2] ?? "",
  };
}

export function stickerPhraseDisplay(phrase: string) {
  return parseStickerPhrases(phrase)
    .map((text) => text.replace(/\n/g, " ").trim())
    .filter(Boolean)
    .join(" · ");
}

export function stickerPhraseValidationError(
  parts: StickerPhraseParts | string[],
  options: { required?: boolean } = {},
) {
  const texts = Array.isArray(parts)
    ? parts
    : [parts.phrase1, parts.phrase2, parts.phrase3 ?? ""];
  const filled = texts.map((text) => text.trim()).filter(Boolean);
  if (options.required !== false && filled.length === 0) {
    return "문구를 입력해 주세요.";
  }
  for (const [index, text] of texts.entries()) {
    if (text.length > MAX_STICKER_PHRASE_LENGTH) {
      return `문구${index + 1}은 ${MAX_STICKER_PHRASE_LENGTH}자 이하로 입력해 주세요.`;
    }
  }
  return null;
}

export function stickerPhraseLines(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
