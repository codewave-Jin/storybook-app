import { sanitizeCustomInputValue } from "@/lib/custom-input-guard";

export type PromptTemplateVariables = Record<string, string>;

export const TEST_ILLUSTRATION_VARIABLES: PromptTemplateVariables = {
  character_1: "지민",
  "answer.favorite_color": "파란색",
  "answer.favorite_animal": "토끼",
  "answer.favorite_place": "바닷가",
};

export function buildOrderPromptVariables(input: {
  characterLabels: string[];
  customInputValues: Record<string, string>;
}): PromptTemplateVariables {
  const variables: PromptTemplateVariables = {};

  input.characterLabels.slice(0, 3).forEach((label, index) => {
    const name = label.trim();
    if (!name) {
      return;
    }
    variables[`character_${index + 1}`] = name;
  });

  for (const [rawKey, value] of Object.entries(input.customInputValues)) {
    const key = rawKey.trim();
    if (!key) {
      continue;
    }
    const answerKey = key.startsWith("answer.") ? key : `answer.${key}`;
    variables[answerKey] = sanitizeCustomInputValue(value);
  }

  return variables;
}

/**
 * Replace `{{key}}` placeholders in a PageTemplate.promptTemplate.
 * Unknown keys are left unchanged.
 */
export function substitutePromptTemplate(
  template: string,
  variables: PromptTemplateVariables,
): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, rawKey: string) => {
    const key = rawKey.trim();
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return variables[key] ?? match;
    }
    return match;
  });
}

export type IllustrationPageKind = "COVER" | "PAGE";

export type BuildIllustrationEditPromptInput = {
  /** Already-substituted scene description from PageTemplate.promptTemplate */
  sceneDescription: string;
  pageType: IllustrationPageKind;
  /** First selected character label (`character_1`). */
  character1Name: string;
  /** Number of character reference images (1–3). Used only by the legacy prompt. */
  characterCount?: number;
};

/**
 * Scene prompt used after the character sheet is already style-transferred.
 * Matches scripts/test-illustration.ts. expressionHint comes from PageTemplate.
 */
export function buildStyledIllustrationPrompt(options: {
  sceneDescription: string;
  expressionHint?: string | null;
}): string {
  const scene = options.sceneDescription.trim();
  const expression = options.expressionHint?.trim() || "";
  const keepAndChange = expression
    ? [
        "[유지할 것] 얼굴형, 이목구비의 생김새, 헤어스타일, 의상, 그림체",
        `[변경할 것] 포즈, 배경, 그리고 표정: ${expression}`,
        "표정은 눈과 입의 변화로만 표현하고 얼굴형과 볼살은 유지하세요",
      ]
    : [
        "[유지할 것] 얼굴형, 이목구비의 생김새, 표정, 헤어스타일, 의상, 그림체",
        "[변경할 것] 포즈와 배경만 장면에 맞게 표현",
      ];

  return [
    `이 캐릭터의 정체성과 그림체를 유지하면서 다음 장면을 그려주세요: ${scene}`,
    "",
    ...keepAndChange,
    "",
    "얼굴에 사진 질감이나 광택 렌더링을 넣지 마세요.",
  ].join("\n");
}

const CHARACTER_LABELS = ["Character A", "Character B", "Character C"] as const;
const ORDINALS = ["first", "second", "third", "fourth"] as const;

function characterLabelList(count: number): string {
  const labels = CHARACTER_LABELS.slice(0, count);
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/** "소민" → "소민이", "소민이" → "소민이" */
export function withISuffix(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.endsWith("이") ? trimmed : `${trimmed}이`;
}

export function buildCoverTitle(character1Name: string): string {
  return `${withISuffix(character1Name)}의 숲속 친구들과의 하루`;
}

/** Strip trailing sentence punctuation so `장면은 ${scene}.` does not double up. */
function normalizeSceneForPrompt(scene: string): string {
  return scene.trim().replace(/[.。!?！？\s]+$/u, "");
}

function buildIllustrationStyleClauses(): string {
  return [
    "전체적으로 2번 이미지의 그림체로 그려줘.",
    "1번 이미지의 캐릭터 얼굴 정체성을 유지하고, 2번 이미지는 오직 그림체 레퍼런스로만 사용해.",
    "2번 이미지 속 인물의 얼굴 특징은 절대 가져오지 마.",
    "선, 색감, 질감, 붓터치, 배경, 인물 처리까지 모두 2번 이미지 그림체와 일치하게 그려줘.",
  ].join(" ");
}

/**
 * Active illustration prompt. Character from image 1, style from image 2,
 * scene from the substituted PageTemplate, plus cover/page text rules.
 * Single paragraph (space-separated) for GPT.
 */
export function buildIllustrationEditPrompt(
  input: BuildIllustrationEditPromptInput,
): string {
  const scene = normalizeSceneForPrompt(input.sceneDescription);
  const parts = [buildIllustrationStyleClauses(), `장면은 ${scene}.`];

  if (input.pageType === "COVER") {
    parts.push(
      `제목은 "${buildCoverTitle(input.character1Name)}"라고 그림 안에 표지답게 예쁘게 넣어줘.`,
    );
  } else {
    parts.push("글자는 넣지 마.");
  }

  parts.push("사이즈는 1024*1024");

  return parts.join(" ");
}

/**
 * Previous long English identity/style/safety wrappers.
 * Kept for comparison or a later switch-back; not used by generation.
 */
export function buildIllustrationEditPromptLegacy(
  input: Pick<
    BuildIllustrationEditPromptInput,
    "sceneDescription" | "characterCount"
  >,
): string {
  const scene = input.sceneDescription.trim();
  const characterCount = input.characterCount ?? 1;

  if (characterCount > 1) {
    return buildMultiCharacterPromptLegacy(scene, characterCount);
  }

  return [
    "Image roles:",
    "- The first image is the character reference.",
    "- The second image is the art-style reference.",
    "",
    "Character identity (first image):",
    "CRITICAL: This is the SAME child as the reference image, not a similar-looking child.",
    "Copy the exact facial structure: eye shape and spacing, nose shape, mouth shape, cheek fullness, and face proportions from the reference image precisely.",
    "Do not idealize, adjust, or subtly redesign the face. Any deviation from the reference face is an error.",
    "Also preserve hairstyle, hair color, skin tone, clothing design, and colors with very high fidelity.",
    "Do not reinterpret or redesign the character. If the reference is an upper-body crop, naturally extend to a full body when the scene needs it.",
    "",
    "Art style (second image):",
    "Match the second image's illustration style, brushwork/line quality, texture, color palette, and lighting mood.",
    "Do not copy the second image's composition or subjects—only its visual style.",
    "The art style must show visible watercolor characteristics: soft bleeding edges where colors blend into each other, visible paper texture, uneven pigment saturation, loose and imperfect brushstrokes.",
    "Avoid crisp vector-like outlines, avoid smooth airbrushed digital shading, avoid flat uniform color fills — this should look hand-painted, not digitally rendered.",
    "",
    "Scene to depict:",
    scene,
    "",
    "Safety and output constraints:",
    "Create a gentle, child-friendly picture-book illustration.",
    "No scary, violent, sexual, or otherwise inappropriate content.",
    "No text, letters, numbers, logos, or watermarks in the image.",
    "Prefer a medium-wide full-body composition when the scene allows.",
  ].join("\n");
}

function buildMultiCharacterPromptLegacy(
  scene: string,
  characterCount: number,
): string {
  const labels = CHARACTER_LABELS.slice(0, characterCount);
  const styleOrdinal = ORDINALS[characterCount];
  const mixClause = characterLabelList(characterCount);

  const roleLines = [
    "Image roles:",
    ...labels.map(
      (label, index) => `- The ${ORDINALS[index]} image is ${label}.`,
    ),
    `- The ${styleOrdinal} image is the art-style reference.`,
  ];

  const identityBlocks = labels.flatMap((label, index) => {
    const ordinal = ORDINALS[index];
    return [
      `${label} (${ordinal} image):`,
      `CRITICAL: ${label} is the SAME child as the ${ordinal} reference image, not a similar-looking child.`,
      `Copy ${label}'s exact facial structure: eye shape and spacing, nose shape, mouth shape, cheek fullness, and face proportions from the ${ordinal} reference image precisely.`,
      `Do not idealize, adjust, or subtly redesign ${label}'s face. Any deviation from the ${ordinal} reference face is an error.`,
      `Also preserve ${label}'s hairstyle, hair color, skin tone, clothing design, and colors with very high fidelity.`,
      `Do not reinterpret or redesign ${label}. If the reference is an upper-body crop, naturally extend to a full body when the scene needs it.`,
      "",
    ];
  });

  return [
    ...roleLines,
    "",
    ...identityBlocks,
    "Keep identities separate:",
    `Do not blend or mix features between ${mixClause} — each must remain distinctly themselves.`,
    "",
    `Art style (${styleOrdinal} image):`,
    `Match the ${styleOrdinal} image's illustration style, brushwork/line quality, texture, color palette, and lighting mood.`,
    `Do not copy the ${styleOrdinal} image's composition or subjects—only its visual style.`,
    "The art style must show visible watercolor characteristics: soft bleeding edges where colors blend into each other, visible paper texture, uneven pigment saturation, loose and imperfect brushstrokes.",
    "Avoid crisp vector-like outlines, avoid smooth airbrushed digital shading, avoid flat uniform color fills — this should look hand-painted, not digitally rendered.",
    "",
    "Scene to depict:",
    scene,
    "",
    "Safety and output constraints:",
    "Create a gentle, child-friendly picture-book illustration.",
    "No scary, violent, sexual, or otherwise inappropriate content.",
    "No text, letters, numbers, logos, or watermarks in the image.",
    "Prefer a medium-wide full-body composition when the scene allows.",
  ].join("\n");
}
