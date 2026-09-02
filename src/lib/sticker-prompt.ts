const CIRCULAR_DIE_CUT_INSTRUCTION =
  "The entire design must be enclosed within a clean, solid circular border/outline (like a badge or coin shape) — this circular edge defines the die-cut boundary for printing. Everything (character, flowers, text) must stay within this circle. The area outside the circle must be plain white, providing cutting margin.";

/** New pipeline prompt from scripts/test-sticker.ts. */
export function buildStickerCompositePrompt(input: {
  costume: string;
  phrase: string;
}): string {
  return [
    `해당 사진 안의 캐릭터를 ${input.costume} 입은 캐릭터로 바꿔주고`,
    `"${input.phrase}" 라는 문구를 넣어줘.`,
    "원형 스티커로 만들 거니까 꾸며주되 캐릭터의 닮은꼴이 바뀌면 안 돼.",
  ].join("\n");
}

/** Legacy 2-image GPT prompt. Kept for orders without borderId. */
export function buildStickerPreviewPrompt(input: {
  phrase: string;
  costumeHint: string;
}): string {
  const costumeHint = input.costumeHint.trim();
  const characterClause = costumeHint
    ? `첫번째 이미지의 캐릭터 초상화를 ${costumeHint}을 입혀주고`
    : "첫번째 이미지의 캐릭터 초상화를 그대로 유지해서";
  const simple =
    `${characterClause}\n` +
    `두번째 이미지 레퍼런스처럼 원형 스티커 만들어야해\n` +
    `문구는 "${input.phrase}"로 해줘`;

  return `${simple}\n\n${CIRCULAR_DIE_CUT_INSTRUCTION}`;
}
