export type CustomFieldOption = {
  value: string;
  label: string;
  emoji?: string;
};

export type CustomField = {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  options?: CustomFieldOption[];
};

export const FAVORITE_COLOR_OPTIONS: CustomFieldOption[] = [
  { value: "빨강", label: "빨강", emoji: "🔴" },
  { value: "노랑", label: "노랑", emoji: "🟡" },
  { value: "초록", label: "초록", emoji: "🟢" },
  { value: "파랑", label: "파랑", emoji: "🔵" },
  { value: "분홍", label: "분홍", emoji: "💗" },
  { value: "보라", label: "보라", emoji: "🟣" },
];

export const FAVORITE_ANIMAL_OPTIONS: CustomFieldOption[] = [
  { value: "토끼", label: "토끼", emoji: "🐰" },
  { value: "곰", label: "곰", emoji: "🐻" },
  { value: "강아지", label: "강아지", emoji: "🐶" },
  { value: "고양이", label: "고양이", emoji: "🐱" },
  { value: "코끼리", label: "코끼리", emoji: "🐘" },
  { value: "기린", label: "기린", emoji: "🦒" },
];

const CHOICE_FIELD_OVERLAY: Record<
  string,
  { label: string; options: CustomFieldOption[]; required?: boolean }
> = {
  favorite_color: {
    label: "좋아하는 색깔은 무엇인가요?",
    options: FAVORITE_COLOR_OPTIONS,
  },
  favorite_animal: {
    label: "좋아하는 동물 친구는 누구인가요?",
    options: FAVORITE_ANIMAL_OPTIONS,
  },
};

export function customFieldOptions(field: CustomField): CustomFieldOption[] {
  if (field.options && field.options.length > 0) {
    return field.options;
  }
  return CHOICE_FIELD_OVERLAY[field.key]?.options ?? [];
}

export function isChoiceCustomField(field: CustomField) {
  return field.type === "choice" || customFieldOptions(field).length > 0;
}

export function customFieldDisplayValue(field: CustomField, value: string) {
  const option = customFieldOptions(field).find(
    (item) => item.value === value,
  );
  if (!option) {
    return value;
  }
  return option.emoji ? `${option.emoji} ${option.label}` : option.label;
}

export type HeroAgeRangeKey = "AGE_1_2" | "AGE_3_4" | "AGE_5_7";

export const HERO_AGE_RANGES = [
  { key: "AGE_1_2", label: "1~2세", disabled: false },
  { key: "AGE_3_4", label: "3~4세", disabled: true },
  { key: "AGE_5_7", label: "5~7세", disabled: true },
] as const;

export type CastRole = {
  key: string;
  label: string;
};

export type SupportingCastMember = {
  characterId: string;
  relationKey: string;
};

export const MAX_SUPPORTING_CAST = 1;

const CAST_ROLES_BY_TITLE: Record<string, CastRole[]> = {
  "두근두근 생일 파티": [
    { key: "mom", label: "엄마" },
    { key: "dad", label: "아빠" },
  ],
  "숲속 친구들과 생일파티": [
    { key: "mom", label: "엄마" },
    { key: "dad", label: "아빠" },
  ],
  "숲속 친구들과의 하루": [
    { key: "mom", label: "엄마" },
    { key: "dad", label: "아빠" },
  ],
  "용사 이야기": [{ key: "villain", label: "악당" }],
};

export function isHeroAgeRangeKey(value: string): value is HeroAgeRangeKey {
  return HERO_AGE_RANGES.some((range) => range.key === value);
}

export function isEnabledHeroAgeRangeKey(
  value: string,
): value is HeroAgeRangeKey {
  return HERO_AGE_RANGES.some((range) => range.key === value && !range.disabled);
}

export function heroAgeRangeLabel(key: string | null | undefined) {
  return HERO_AGE_RANGES.find((range) => range.key === key)?.label ?? null;
}

export function parseCastRoles(value: unknown, title?: string): CastRole[] {
  const parsed = Array.isArray(value)
    ? value.flatMap((role) => {
        if (
          !role ||
          typeof role !== "object" ||
          typeof (role as CastRole).key !== "string" ||
          typeof (role as CastRole).label !== "string"
        ) {
          return [];
        }
        const key = (role as CastRole).key.trim();
        const label = (role as CastRole).label.trim();
        if (!key || !label) {
          return [];
        }
        return [{ key, label }];
      })
    : [];

  if (parsed.length > 0) {
    return parsed;
  }

  return title ? (CAST_ROLES_BY_TITLE[title] ?? []) : [];
}

export function parseSupportingCast(value: unknown): SupportingCastMember[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as SupportingCastMember).characterId !== "string" ||
      typeof (item as SupportingCastMember).relationKey !== "string"
    ) {
      return [];
    }
    const characterId = (item as SupportingCastMember).characterId.trim();
    const relationKey = (item as SupportingCastMember).relationKey.trim();
    if (!characterId || !relationKey) {
      return [];
    }
    return [{ characterId, relationKey }];
  });
}

export function castRoleLabel(roles: CastRole[], key: string) {
  return roles.find((role) => role.key === key)?.label ?? key;
}

export const ACTIVE_STORYBOOK_TEMPLATE_TITLE = "두근두근 생일 파티";

export const BIRTHDAY_STORYBOOK_TEMPLATE_TITLES = [
  ACTIVE_STORYBOOK_TEMPLATE_TITLE,
  "숲속 친구들과 생일파티",
  "숲속 친구들과의 하루",
] as const;

export function isBirthdayStorybookTitle(title: string) {
  return (BIRTHDAY_STORYBOOK_TEMPLATE_TITLES as readonly string[]).includes(
    title,
  );
}
export const ACTIVE_STICKER_TEMPLATE_KEY = "first-birthday";
/** Review.productId for all sticker orders. Template is no longer a product. */
export const STICKER_REVIEW_PRODUCT_ID = "sticker";

export const STICKER_BORDER_CATEGORY_ORDER = [
  "NONE",
  "BASIC",
  "FLOWER",
  "LINE",
  "SPECIAL",
] as const;

export type StickerBorderCategoryKey =
  (typeof STICKER_BORDER_CATEGORY_ORDER)[number];

export const STICKER_BORDER_CATEGORY_LABEL: Record<
  StickerBorderCategoryKey,
  string
> = {
  NONE: "없음",
  BASIC: "기본",
  FLOWER: "꽃",
  LINE: "라인",
  SPECIAL: "특수",
};

/** Border for new orders, template for legacy orders without a border. */
export function stickerOrderExtraLabel(order: {
  border?: { label: string } | null;
  template?: { label: string } | null;
}) {
  return order.border?.label?.trim() || order.template?.label?.trim() || null;
}

export function stickerOrderTitle(
  characterLabel: string,
  extraLabel?: string | null,
) {
  return extraLabel?.trim()
    ? `${characterLabel} · ${extraLabel.trim()}`
    : characterLabel;
}

const STICKER_TEMPLATE_LABELS: Record<string, string> = {
  basic: "스승의날",
  dinosaur: "어버이날",
  crown: "일반 스티커",
  "first-birthday": "답례품",
};

export function isStorybookTemplateSelectable(title: string) {
  return title === ACTIVE_STORYBOOK_TEMPLATE_TITLE;
}

export function isStickerTemplateSelectable(key: string) {
  return key === ACTIVE_STICKER_TEMPLATE_KEY;
}

export function isStickerSizeSelectable(label: string) {
  return label.startsWith("중형");
}

export function stickerTemplateLabel(key: string, fallback: string) {
  return STICKER_TEMPLATE_LABELS[key] ?? fallback;
}

export function parseCustomFields(value: unknown): CustomField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((field) => {
    if (
      !field ||
      typeof field !== "object" ||
      typeof (field as CustomField).key !== "string" ||
      typeof (field as CustomField).label !== "string" ||
      typeof (field as CustomField).type !== "string"
    ) {
      return [];
    }

    const parsed = field as CustomField;
    if (parsed.key === "favorite_place") {
      return [];
    }
    const overlay = CHOICE_FIELD_OVERLAY[parsed.key];
    const options = parseCustomFieldOptions(
      (field as { options?: unknown }).options,
    );
    const resolvedOptions =
      options.length > 0 ? options : overlay?.options ?? [];

    return [
      {
        key: parsed.key,
        label: overlay?.label ?? parsed.label,
        type: resolvedOptions.length > 0 ? "choice" : parsed.type,
        placeholder:
          typeof parsed.placeholder === "string"
            ? parsed.placeholder
            : undefined,
        required:
          overlay?.required !== undefined
            ? overlay.required
            : typeof parsed.required === "boolean"
              ? parsed.required
              : true,
        options: resolvedOptions.length > 0 ? resolvedOptions : undefined,
      },
    ];
  });
}

function parseCustomFieldOptions(value: unknown): CustomFieldOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((option) => {
    if (!option || typeof option !== "object") {
      return [];
    }
    const raw = option as CustomFieldOption;
    const optionValue = typeof raw.value === "string" ? raw.value.trim() : "";
    const label =
      typeof raw.label === "string" && raw.label.trim()
        ? raw.label.trim()
        : optionValue;
    if (!optionValue || !label) {
      return [];
    }
    return [
      {
        value: optionValue,
        label,
        emoji: typeof raw.emoji === "string" ? raw.emoji : undefined,
      },
    ];
  });
}
