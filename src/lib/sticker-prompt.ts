const CIRCULAR_DIE_CUT_INSTRUCTION =
  "The entire design must be enclosed within a clean, solid circular border/outline (like a badge or coin shape) — this circular edge defines the die-cut boundary for printing. Everything (character, flowers, text) must stay within this circle. The area outside the circle must be plain white, providing cutting margin.";

export function buildStickerPreviewPrompt(input: {
  phrase: string;
  costumeHint: string;
}): string {
  const costumeHint = input.costumeHint.trim();
  const simple =
    `첫 번째 사진 캐릭터를 ${costumeHint} 입은 모습으로 바꿔주고, ` +
    `두 번째 레퍼런스를 참고해서 원형 스티커로 만들어주는데 문구는 '${input.phrase}'로 해줘`;

  return `${simple}\n\n${CIRCULAR_DIE_CUT_INSTRUCTION}`;
}
