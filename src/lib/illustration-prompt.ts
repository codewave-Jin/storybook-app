import { sanitizeCustomInputValue } from "@/lib/custom-input-guard";
export {
  artStyleSceneHint,
  buildFaceIdentityImageRoles,
  buildSceneStyleReferenceRole,
  buildStyledIllustrationPrompt,
} from "@/lib/storybook-prompts";

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
  heroAgeLabel?: string | null;
  supportingCast?: Array<{ relationKey: string; label: string }>;
}): PromptTemplateVariables {
  const variables: PromptTemplateVariables = {};

  input.characterLabels.slice(0, 5).forEach((label, index) => {
    const name = label.trim();
    if (!name) {
      return;
    }
    variables[`character_${index + 1}`] = name;
  });

  const age = input.heroAgeLabel?.trim();
  if (age) {
    variables.hero_age = age;
  }

  for (const member of input.supportingCast ?? []) {
    const relationKey = member.relationKey.trim();
    const name = member.label.trim();
    if (!relationKey || !name) {
      continue;
    }
    const key = `cast.${relationKey}`;
    variables[key] = variables[key] ? `${variables[key]}, ${name}` : name;
  }

  for (const [rawKey, value] of Object.entries(input.customInputValues)) {
    const key = rawKey.trim();
    if (!key) {
      continue;
    }
    const answerKey = key.startsWith("answer.") ? key : `answer.${key}`;
    variables[answerKey] = sanitizeCustomInputValue(value);
  }

  if (!variables["answer.favorite_place"]) {
    variables["answer.favorite_place"] = "바닷가";
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
  return `${withISuffix(character1Name)}의 두근두근 생일 파티`;
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
    const sceneForbidsText =
      /제목|글자/.test(input.sceneDescription) &&
      /넣지/.test(input.sceneDescription);
    if (sceneForbidsText) {
      parts.push("그림 안에 제목이나 글자를 넣지 마.");
    } else {
      parts.push(
        `제목은 "${buildCoverTitle(input.character1Name)}"라고 그림 안에 표지답게 예쁘게 넣어줘.`,
      );
    }
  } else {
    parts.push("글자는 넣지 마.");
  }

  parts.push(
    input.pageType === "COVER"
      ? "사이즈는 1024*1024"
      : "사이즈는 2048*1024, 가로로 긴 한 장의 연속 장면. 가운데 접힌 선이나 페이지 구분선을 그리지 마.",
  );

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
    "The art style must match the art-style reference image's medium, line, texture, and coloring.",
    "Do not default to a watercolor picture-book look unless that reference is watercolor.",
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
    "The art style must match the art-style reference image's medium, line, texture, and coloring.",
    "Do not default to a watercolor picture-book look unless that reference is watercolor.",
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
