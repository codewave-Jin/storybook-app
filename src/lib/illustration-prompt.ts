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
    variables[answerKey] = value;
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

export type BuildIllustrationEditPromptInput = {
  /** Already-substituted scene description from PageTemplate.promptTemplate */
  sceneDescription: string;
  /** Number of character reference images (1–3). Defaults to 1. */
  characterCount?: number;
};

const CHARACTER_LABELS = ["Character A", "Character B", "Character C"] as const;
const ORDINALS = ["first", "second", "third", "fourth"] as const;

function characterLabelList(count: number): string {
  const labels = CHARACTER_LABELS.slice(0, count);
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/**
 * Compose the full images.edit / Responses image_generation prompt.
 * Scene text comes from admin PageTemplate; role/style/safety wrappers are shared.
 * Single-character wording is unchanged; multi-character roles are used only when count > 1.
 */
export function buildIllustrationEditPrompt(
  input: BuildIllustrationEditPromptInput,
): string {
  const scene = input.sceneDescription.trim();
  const characterCount = input.characterCount ?? 1;

  if (characterCount > 1) {
    return buildMultiCharacterPrompt(scene, characterCount);
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

function buildMultiCharacterPrompt(scene: string, characterCount: number): string {
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
