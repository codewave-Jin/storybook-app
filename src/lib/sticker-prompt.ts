const CIRCULAR_DIE_CUT_INSTRUCTION =
  "The entire design must be enclosed within a clean, solid circular border/outline (like a badge or coin shape) — this circular edge defines the die-cut boundary for printing. Everything (character, flowers, text) must stay within this circle. The area outside the circle must be plain white, providing cutting margin.";

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
