export type CustomField = {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
};

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
