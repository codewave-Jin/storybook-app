export type CustomField = {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
};

export const ACTIVE_STORYBOOK_TEMPLATE_TITLE = "숲속 친구들과의 하루";
export const ACTIVE_STICKER_TEMPLATE_KEY = "first-birthday";

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
    return [
      {
        key: parsed.key,
        label: parsed.label,
        type: parsed.type,
        placeholder:
          typeof parsed.placeholder === "string"
            ? parsed.placeholder
            : undefined,
      },
    ];
  });
}
