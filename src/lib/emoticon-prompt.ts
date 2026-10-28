export const EMOTICON_COLUMNS = 3;
export const EMOTICON_ROWS = 3;

export type EmoticonAgeUnit = "months" | "years";

export type EmoticonCell = {
  key: string;
  caption: string;
  pose: string;
};

export const EMOTICON_CELLS: EmoticonCell[] = [
  {
    key: "hello",
    caption: "안녕!",
    pose: '1. HELLO\nA cheerful expression with a big smile, waving both hands.\nAdd small pink hearts.\nKorean caption: "안녕!"',
  },
  {
    key: "happy",
    caption: "좋아!",
    pose: '2. HAPPY\nA delighted smile with both fists gently resting against the cheeks.\nAdd small hearts and yellow sparkles.\nKorean caption: "좋아!"',
  },
  {
    key: "kiss",
    caption: "쪽♡",
    pose: '3. KISS\nA playful wink with puckered lips, blowing a kiss.\nAdd floating pink hearts.\nKorean caption: "쪽♡"',
  },
  {
    key: "laughing",
    caption: "ㅋㅋㅋ",
    pose: '4. LAUGHING\nLaughing joyfully with eyes nearly closed.\nAdd playful cartoon-style laughing tears.\nKorean caption: "ㅋㅋㅋ"',
  },
  {
    key: "sleeping",
    caption: "잘자~",
    pose: '5. SLEEPING\nSleeping peacefully with closed eyes, resting beside a soft plush toy.\nAdd a crescent moon and tiny stars.\nKorean caption: "잘자~"',
  },
  {
    key: "surprised",
    caption: "헉!",
    pose: '6. SURPRISED\nWide-open eyes and mouth, both hands touching the cheeks.\nAdd colorful exclamation marks and yellow emphasis lines.\nKorean caption: "헉!"',
  },
  {
    key: "thumbs-up",
    caption: "최고!",
    pose: '7. THUMBS UP\nSmiling confidently while showing two thumbs up.\nAdd yellow stars and sparkles.\nKorean caption: "최고!"',
  },
  {
    key: "peekaboo",
    caption: "뿅!",
    pose: '8. PEEKABOO\nPlayfully peeking from behind a fluffy blanket.\nOnly the upper face and small hands are visible.\nKorean caption: "뿅!"',
  },
  {
    key: "love",
    caption: "사랑해♡",
    pose: '9. LOVE\nHappily hugging a large pink heart.\nAdd floating pink hearts around the character.\nKorean caption: "사랑해♡"',
  },
];

const NO_AGE_INSTRUCTION =
  "Preserve the apparent age and natural body proportions of the person or character shown in the reference image. Do not intentionally make the character younger or older.";

const POST_PROCESS_TEXT_INSTRUCTION =
  "Do not render any text, letters, words, or numbers. Keep the top 18% of every cell as empty white space, the same height in all nine cells, for Korean captions to be added during post-processing. Do not place the face, hands, props, or decorations in that band.";

export function emoticonAgeUnitPhrase(age: number, unit: EmoticonAgeUnit) {
  if (unit === "months") {
    return age === 1 ? "month" : "months";
  }
  return age === 1 ? "year" : "years";
}

export function emoticonDownloadName(index: number, caption: string) {
  const safe = caption.replace(/[\\/:*?"<>|]/g, "").trim() || "emoticon";
  return `${String(index + 1).padStart(2, "0")}-${safe}.png`;
}

export function buildEmoticonAgeInstruction(
  age: number | null | undefined,
  unit: EmoticonAgeUnit | null | undefined,
) {
  if (!age || !unit) {
    return NO_AGE_INSTRUCTION;
  }
  return `Represent the character at approximately ${age} ${emoticonAgeUnitPhrase(age, unit)} old. Naturally reflect the facial softness, head-to-body ratio, and physical proportions typical of this age while preserving the original recognizable facial identity.`;
}

export function buildEmoticonSheetPrompt(input: {
  age?: number | null;
  ageUnit?: EmoticonAgeUnit | null;
}) {
  const ageInstruction = buildEmoticonAgeInstruction(input.age, input.ageUnit);
  const row1 = EMOTICON_CELLS.slice(0, 3).map((cell) => cell.pose).join("\n\n");
  const row2 = EMOTICON_CELLS.slice(3, 6).map((cell) => cell.pose).join("\n\n");
  const row3 = EMOTICON_CELLS.slice(6, 9).map((cell) => cell.pose).join("\n\n");

  return `You are a professional character artist specializing in high-quality, adorable baby and children's messaging stickers.

Create a single square sticker sheet containing exactly nine different expressive stickers arranged in a precise 3×3 grid.

Use the provided reference image as the primary visual reference.

### Character Identity Preservation

The character in all nine stickers MUST represent the exact same person or character shown in the reference image.

Preserve the original:
- Facial structure and proportions
- Eye shape and placement
- Nose and mouth characteristics
- Skin tone
- Hair color and hairstyle
- Distinctive facial features
- Overall recognizable identity

Maintain strong facial consistency across all nine stickers.

Do not invent a new face or replace the original identity with a generic cute baby face.

Expressions and poses may change, but the underlying facial identity must remain consistent.

### Reference Image Style

If the reference image is a real photograph:
- Preserve the recognizable real-life facial identity.
- Maintain a natural, realistic photographic appearance.
- Create adorable, expressive, photo-based baby stickers.

If the reference image is an illustration:
- Preserve the original illustration style.
- Maintain the original colors, textures, linework, and rendering characteristics.
- Do not convert the character into a different artistic style.

All nine stickers must share the same visual style.

### Age Adaptation

${ageInstruction}

Age adaptation must remain subtle and natural.

Preserve the original character's identity even when adjusting age-related proportions.

Do not exaggerate age transformation or substantially alter facial features.

### Sticker Composition

Create exactly nine stickers in the following order.

ROW 1:

${row1}

ROW 2:

${row2}

ROW 3:

${row3}

### Layout Requirements

- Create ONE single square image.
- Arrange exactly NINE stickers in THREE equal rows and THREE equal columns.
- Divide the square into nine identical cells. Every cell has the same width and the same height.
- Use one continuous pure white (#FFFFFF) background for the whole image.
- Do not draw a card, rounded rectangle, frame, border, sticker outline, drop shadow, or vignette behind any character.
- Every character is a clean cutout on that same white. Use this treatment in all nine cells.
- Keep the same head size in every cell. The face should fill a similar portion of each cell.
- Center each character horizontally. Align the eyes to the same height within every cell.
- Props such as a blanket, plush toy, or heart must not shrink or enlarge the face.
- Keep the gap between characters equal horizontally and vertically.
- Keep each sticker fully inside its own cell. Do not overlap a neighboring cell.
- Leave the same empty white band at the top of every cell.

### Visual Design

- Adorable, premium-quality baby messaging sticker aesthetic.
- Expressive facial emotions.
- Natural, charming hand gestures.
- Soft pastel decorations, similar in size and weight in every cell.
- Cute hand-drawn hearts, stars, and sparkles. Keep them small and beside the character.
- The same character proportions, crop, lighting, and rendering in all nine stickers.
- Face-focused upper-body compositions.
- One consistent sheet, not nine separately designed stickers.

### Text Rendering

${POST_PROCESS_TEXT_INSTRUCTION}

### Critical Requirements

1. Preserve the original character's identity.
2. Maintain consistent facial features across all nine stickers.
3. Preserve the reference image's visual style.
4. Reflect the specified age naturally when provided.
5. Generate exactly nine distinct expressions.
6. Arrange the stickers in an exact 3×3 grid of equal cells.
7. Use one continuous white background, with no per-cell card or frame.
8. Keep the face size, eye line, and margins the same in every cell.
9. Ensure no sticker elements overlap neighboring cells.
10. Do not generate extra characters or duplicate stickers.`;
}

const MONTH_MIN = 1;
const MONTH_MAX = 36;
const YEAR_MIN = 1;
const YEAR_MAX = 12;

export function parseEmoticonAgeInput(
  ageRaw: unknown,
  unitRaw: unknown,
):
  | { age: null; ageUnit: null }
  | { age: number; ageUnit: EmoticonAgeUnit }
  | { error: string } {
  const ageText = typeof ageRaw === "string" ? ageRaw.trim() : "";
  if (!ageText) {
    return { age: null, ageUnit: null };
  }
  if (!/^\d+$/.test(ageText)) {
    return { error: "나이는 숫자로 입력해 주세요." };
  }
  const age = Number(ageText);
  const ageUnit = unitRaw === "years" || unitRaw === "months" ? unitRaw : null;
  if (!ageUnit) {
    return { error: "나이 단위를 선택해 주세요." };
  }
  if (ageUnit === "months" && (age < MONTH_MIN || age > MONTH_MAX)) {
    return { error: "개월 수는 1개월부터 36개월까지 입력할 수 있습니다." };
  }
  if (ageUnit === "years" && (age < YEAR_MIN || age > YEAR_MAX)) {
    return { error: "나이는 1세부터 12세까지 입력할 수 있습니다." };
  }
  return { age, ageUnit };
}
