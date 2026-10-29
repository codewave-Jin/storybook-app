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
    pose: '1. HELLO\nA cheerful expression with a big smile, waving both hands.\nAdd small pink hearts.\nDraw this exact text at the top: 안녕!',
  },
  {
    key: "happy",
    caption: "좋아!",
    pose: '2. HAPPY\nA delighted smile with both fists gently resting against the cheeks.\nAdd small hearts and yellow sparkles.\nDraw this exact text at the top: 좋아!',
  },
  {
    key: "kiss",
    caption: "쪽♡",
    pose: '3. KISS\nA playful wink with puckered lips, blowing a kiss.\nAdd floating pink hearts.\nDraw this exact text at the top: 쪽♡',
  },
  {
    key: "laughing",
    caption: "ㅋㅋㅋ",
    pose: '4. LAUGHING\nLaughing joyfully with eyes nearly closed.\nAdd playful cartoon-style laughing tears.\nDraw this exact text at the top: ㅋㅋㅋ',
  },
  {
    key: "sleeping",
    caption: "잘자~",
    pose: '5. SLEEPING\nSleeping peacefully with closed eyes, resting beside a soft plush toy.\nAdd a crescent moon and tiny stars.\nDraw this exact text at the top: 잘자~',
  },
  {
    key: "surprised",
    caption: "헉!",
    pose: '6. SURPRISED\nWide-open eyes and mouth, both hands touching the cheeks.\nAdd colorful exclamation marks and yellow emphasis lines.\nDraw this exact text at the top: 헉!',
  },
  {
    key: "thumbs-up",
    caption: "최고!",
    pose: '7. THUMBS UP\nSmiling confidently while showing two thumbs up.\nAdd yellow stars and sparkles.\nDraw this exact text at the top: 최고!',
  },
  {
    key: "peekaboo",
    caption: "뿅!",
    pose: '8. PEEKABOO\nPlayfully peeking from behind a fluffy blanket.\nOnly the upper face and small hands are visible.\nDraw this exact text at the top: 뿅!',
  },
  {
    key: "love",
    caption: "사랑해♡",
    pose: '9. LOVE\nHappily hugging a large pink heart.\nAdd floating pink hearts around the character.\nDraw this exact text at the top: 사랑해♡',
  },
];

export const EMOTICON_THEME_IDS = ["basic", "new-year", "halloween", "holiday", "christmas"] as const;

export type EmoticonThemeId = (typeof EMOTICON_THEME_IDS)[number];

export type EmoticonTheme = {
  id: EmoticonThemeId;
  label: string;
  description: string;
  outfit: string;
  captionNote?: string;
  cells: EmoticonCell[];
};

const THEMED_OUTFIT_RULE =
  "Use this same outfit in all nine cells. Do not switch costumes between cells. Keep the face, eyes, and hair visible and recognizable. If the reference is a real photograph, the clothes must look like real clothing worn by that person. If the reference is an illustration, draw the clothes in that same illustration style, palette, and linework. Do not replace the face with a generic character.";

function emoticonPose(index: number, title: string, action: string, accent: string, caption: string) {
  return `${index}. ${title}\n${action}\n${accent}\nDraw this exact text at the top: ${caption}`;
}

function themedCells(
  captions: [string, string, string, string, string, string, string, string, string],
  accents: [string, string, string, string, string, string, string, string, string],
  actionOverrides?: Partial<Record<number, string>>,
): EmoticonCell[] {
  const actions = [
    "A cheerful expression with a big smile, waving both hands.",
    "A delighted smile with both fists gently resting against the cheeks.",
    "A playful wink with puckered lips, blowing a kiss.",
    "Laughing joyfully with eyes nearly closed. Add playful cartoon-style laughing tears.",
    "Sleeping peacefully with closed eyes, resting beside a soft plush toy.",
    "Wide-open eyes and mouth, both hands touching the cheeks.",
    "Smiling confidently while showing two thumbs up.",
    "Playfully peeking. Only the upper face and small hands are visible.",
    "Happily hugging a large heart.",
  ];
  const titles = ["HELLO", "HAPPY", "KISS", "LAUGHING", "SLEEPING", "SURPRISED", "THUMBS UP", "PEEKABOO", "LOVE"];
  return EMOTICON_CELLS.map((cell, index) => ({
    key: cell.key,
    caption: captions[index],
    pose: emoticonPose(
      index + 1,
      titles[index],
      actionOverrides?.[index] ?? actions[index],
      accents[index],
      captions[index],
    ),
  }));
}

export const EMOTICON_THEMES: EmoticonTheme[] = [
  {
    id: "basic",
    label: "기본",
    description: "원래 옷과 일상 문구",
    outfit:
      "Keep the clothing, colors, and accessories already visible in the reference image. Do not invent a costume. Small expression props may sit beside the character, but the outfit stays the one in the reference.",
    cells: EMOTICON_CELLS,
  },
  {
    id: "new-year",
    label: "새해인사",
    description: "새해 옷과 덕담",
    outfit: `${THEMED_OUTFIT_RULE} Dress them for New Year greetings in a bright red or gold knit cardigan, a soft scarf, and a small festive ribbon or headband above the forehead. Add only small New Year props beside the body, such as gold confetti or a tiny sparkler.`,
    captionNote:
      "The first cell must show this complete greeting and no shorter version: 새해 복 많이 받으세요. Do not abbreviate it to 새해 복. It may wrap onto two centered lines and be slightly smaller than the other captions so every character stays inside that cell.",
    cells: themedCells(
      ["새해 복 많이 받으세요", "행복해", "복 받아", "신난다", "좋은 꿈", "대박!", "파이팅", "짜잔!", "사랑해♡"],
      [
        "Add tiny gold fireworks and confetti.",
        "Add small gold sparkles.",
        "Add floating gold hearts.",
        "Add colorful confetti.",
        "Add a crescent moon, tiny stars, and a warm new-year glow.",
        "Add gold exclamation marks.",
        "Add yellow stars.",
        "Peek from behind a festive red cloth.",
        "Hug a large gold heart.",
      ],
    ),
  },
  {
    id: "halloween",
    label: "할로윈",
    description: "귀여운 할로윈 옷과 문구",
    outfit: `${THEMED_OUTFIT_RULE} Dress them in one cute, child-friendly Halloween costume: a soft orange pumpkin hood or a small witch hat and a short cape. Never make it gory, frightening, or bloody. Add small pumpkins, wrapped candy, or cute bats beside the character.`,
    cells: themedCells(
      ["사탕 줘", "부우~", "깜찍♡", "히히히", "굿나잇", "깜짝!", "최고!", "짠!", "친구야♡"],
      [
        "Add a small candy and a cute pumpkin.",
        "Add a tiny friendly ghost.",
        "Add small candy hearts.",
        "Add playful candy pieces.",
        "Rest beside a cute ghost plush, with a crescent moon.",
        "Add colorful exclamation marks and a tiny bat.",
        "Add a small pumpkin and yellow stars.",
        "Peek from behind a pumpkin.",
        "Hug a large orange heart.",
      ],
    ),
  },
  {
    id: "holiday",
    label: "명절",
    description: "한복과 명절 인사",
    outfit: `${THEMED_OUTFIT_RULE} Dress them in one child-sized Korean hanbok for a traditional holiday such as Seollal or Chuseok. Use a soft coral, cream, or pale-blue jeogori with a simple skirt or pants that suits the reference. Add small holiday props beside them, such as songpyeon, a persimmon, a bow, or a round moon.`,
    cells: themedCells(
      ["세배요", "풍성해", "고마워♡", "신나용", "달 봐~", "맛있다", "복 많이", "놀자!", "사랑해♡"],
      [
        "Add a small traditional bow beside them. Keep the face fully visible.",
        "Add a round harvest moon and a piece of songpyeon.",
        "Add floating pink hearts.",
        "Add small persimmons.",
        "Rest beside a soft cushion under a crescent moon.",
        "Add a small plate of songpyeon and yellow emphasis lines.",
        "Add a lucky pouch and yellow stars.",
        "Peek from behind a traditional cloth.",
        "Hug a large pink heart.",
      ],
      {
        0: "A warm smile with a small polite bow and hands gently together. The face stays fully visible.",
      },
    ),
  },
  {
    id: "christmas",
    label: "크리스마스",
    description: "크리스마스 옷과 문구",
    outfit: `${THEMED_OUTFIT_RULE} Dress them for Christmas in a red knit sweater or coat and a small Santa hat or reindeer-antler headband that sits above the forehead and leaves the face clear. Add small gifts, holly, or snowflakes beside the character.`,
    captionNote:
      "The first cell must show this complete greeting and no shorter version: 메리크리스마스. Do not abbreviate it to 메리. It may wrap onto two centered lines and be slightly smaller than the other captions so the full word stays inside that cell.",
    cells: themedCells(
      ["메리크리스마스", "축하해", "쪽♡", "호호호", "잘자~", "선물!", "최고!", "짠!", "사랑해♡"],
      [
        "Add tiny snowflakes and a small gift.",
        "Add gold sparkles and holly.",
        "Add floating pink hearts.",
        "Add playful snowflakes.",
        "Rest beside a soft plush toy, with a crescent moon and tiny stars.",
        "Add a wrapped gift and colorful exclamation marks.",
        "Add yellow stars.",
        "Peek from behind a gift box.",
        "Hug a large red heart.",
      ],
    ),
  },
];

const EMOTICON_THEME_BY_ID = new Map(EMOTICON_THEMES.map((theme) => [theme.id, theme]));

export function emoticonThemeById(theme: string | null | undefined) {
  const match = theme ? EMOTICON_THEME_BY_ID.get(theme as EmoticonThemeId) : undefined;
  return match ?? EMOTICON_THEMES[0];
}

export function parseEmoticonTheme(raw: unknown): { theme: EmoticonThemeId } | { error: string } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    return { theme: "basic" };
  }
  if (!EMOTICON_THEME_BY_ID.has(value as EmoticonThemeId)) {
    return { error: "테마를 다시 골라 주세요." };
  }
  return { theme: value as EmoticonThemeId };
}

const NO_AGE_INSTRUCTION =
  "Preserve the apparent age and natural body proportions of the person or character shown in the reference image. Do not intentionally make the character younger or older.";

const POST_PROCESS_TEXT_INSTRUCTION =
  "Draw the Korean caption listed for each cell directly into the image. Render the exact Hangul, including punctuation and hearts, with correct spelling. Use one rounded, friendly, dark-brown handwritten style in every cell. Center each caption in the top 18% of its own cell, at the same size and the same height. Keep that band clear of the face, hands, props, and decorations. Do not add any other words, letters, or numbers.";

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

const PHOTO_LIKENESS_INSTRUCTION = `The reference image is a real photograph of one specific person. Likeness outranks cuteness.

Every sticker must show that same person, not a similar-looking child and not a generic cute character.

Copy these from the photograph and keep them recognizable in all nine cells:
- face shape, jaw, and cheek fullness
- eye shape, eye size, and the space between the eyes
- eyebrow shape
- nose shape and size
- lip shape
- skin tone and visible marks such as moles or dimples
- hair color, hairline, and hairstyle

A person who knows the subject must recognize them in every cell.
Expressions and poses may change. The face design may not.
Do not beautify the face, enlarge the eyes, slim the cheeks, or redraw the person as a different illustrated baby.
If no age was requested, keep the apparent age in the photograph.
Theme clothing may change. Facial identity may not.`;

export function buildEmoticonSheetPrompt(input: {
  age?: number | null;
  ageUnit?: EmoticonAgeUnit | null;
  theme?: string | null;
  referenceKind?: "photo" | "character";
}) {
  const theme = emoticonThemeById(input.theme);
  const photo = input.referenceKind === "photo";
  const ageInstruction = buildEmoticonAgeInstruction(input.age, input.ageUnit);
  const row1 = theme.cells.slice(0, 3).map((cell) => cell.pose).join("\n\n");
  const row2 = theme.cells.slice(3, 6).map((cell) => cell.pose).join("\n\n");
  const row3 = theme.cells.slice(6, 9).map((cell) => cell.pose).join("\n\n");
  const intro = photo
    ? "You are making a messaging-sticker sheet of the exact person in the reference photograph."
    : "You are a professional character artist specializing in high-quality, adorable baby and children's messaging stickers.";
  const styleSection = photo
    ? `The reference is a real photograph.
- Keep a natural photographic appearance of that same person.
- Do not replace the photograph with a new cartoon child.
- Expressions can be sticker-like, but the face must stay identifiable.`
    : `If the reference image is a real photograph:
- Preserve the recognizable real-life facial identity.
- Maintain a natural, realistic photographic appearance.
- Create adorable, expressive, photo-based baby stickers.

If the reference image is an illustration:
- Preserve the original illustration style.
- Maintain the original colors, textures, linework, and rendering characteristics.
- Do not convert the character into a different artistic style.`;

  return `${intro}

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

${photo ? `### Photograph Likeness\n\n${PHOTO_LIKENESS_INSTRUCTION}\n` : ""}
### Reference Image Style

${styleSection}

All nine stickers must share the same visual style.

### Age Adaptation

${ageInstruction}

Age adaptation must remain subtle and natural.

Preserve the original character's identity even when adjusting age-related proportions.

Do not exaggerate age transformation or substantially alter facial features.

### Outfit

${theme.outfit}

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
- Place each cell's Korean caption in the top band. Keep the caption size, color, and vertical position the same in every cell.

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
${theme.captionNote ? `\n${theme.captionNote}` : ""}

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
10. Do not generate extra characters or duplicate stickers.
11. Draw each cell's exact Korean caption inside that cell.
12. Keep the specified outfit consistent in all nine cells.${photo ? "\n13. The photographed person must stay recognizable in all nine cells. Do not substitute a different face." : ""}`;
}

export type EmoticonPreviewCell = {
  key: string;
  caption: string;
  imageUrl: string;
};

export function emoticonPreviewCells(
  cellImagePaths: string[],
  theme?: string | null,
): EmoticonPreviewCell[] {
  return emoticonThemeById(theme).cells.map((cell, index) => ({
    key: cell.key,
    caption: cell.caption,
    imageUrl: cellImagePaths[index] ?? "",
  })).filter((cell) => cell.imageUrl);
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
