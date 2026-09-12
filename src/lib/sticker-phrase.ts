export const BIRTHDAY_PHRASE_KEY = "birthday";

export const BIRTHDAY_TITLE = "첫돌";
export const BIRTHDAY_BODY = "소민이의첫생일에\n와주셔서\n감사합니다";

export const STICKER_PHRASE_OPTIONS = [
  {
    key: "doljanchi",
    label: "돌잔치",
    enabled: false,
    title: "첫돌",
    body: "첫돌을 축하해요",
  },
  {
    key: BIRTHDAY_PHRASE_KEY,
    label: "생일",
    enabled: true,
    title: BIRTHDAY_TITLE,
    body: BIRTHDAY_BODY,
  },
  {
    key: "thanks",
    label: "답례품",
    enabled: false,
    title: "감사합니다",
    body: "와주셔서 감사합니다",
  },
] as const;

export const MAX_STICKER_TITLE_LENGTH = 8;
export const MAX_STICKER_BODY_LENGTH = 60;

export type StickerPhraseParts = {
  title: string;
  body: string;
};

export function serializeStickerPhrase(parts: StickerPhraseParts) {
  const title = parts.title.trim();
  const body = parts.body.replace(/\r\n/g, "\n").trim();
  if (!title) {
    return body;
  }
  return body ? `${title}\n${body}` : title;
}

export function parseStickerPhrase(phrase: string): StickerPhraseParts {
  const lines = phrase.replace(/\r\n/g, "\n").split("\n");
  const title = (lines[0] ?? "").trim();
  const body = lines.slice(1).join("\n").trim();
  if (!body && title && title !== BIRTHDAY_TITLE) {
    return { title: BIRTHDAY_TITLE, body: title };
  }
  return {
    title: title || BIRTHDAY_TITLE,
    body,
  };
}

export function stickerPhraseLines(body: string, maxChars = 10) {
  const explicit = body
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (explicit.length !== 1 || explicit[0].length <= maxChars) {
    return explicit;
  }

  const source = explicit[0];
  const lines: string[] = [];
  let current = "";
  for (const char of source) {
    current += char;
    if (current.length >= maxChars) {
      lines.push(current);
      current = "";
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}
