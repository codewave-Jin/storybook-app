import { parseIdList, parseStringRecord } from "@/lib/orders";
import {
  castRoleLabel,
  customFieldDisplayValue,
  heroAgeRangeLabel,
  parseCastRoles,
  parseCustomFields,
  parseSupportingCast,
} from "@/lib/templates";

export type OrderOptionLine = {
  label: string;
  value: string;
};

export function collectOrderCharacterIds(
  orders: Array<{ selectedCharacterIds: unknown; supportingCast?: unknown }>,
) {
  const ids = new Set<string>();
  for (const order of orders) {
    for (const id of parseIdList(order.selectedCharacterIds)) {
      ids.add(id);
    }
    for (const member of parseSupportingCast(order.supportingCast)) {
      ids.add(member.characterId);
    }
  }
  return [...ids];
}

export function storybookOrderOptionLines(input: {
  selectedCharacterIds: unknown;
  customInputValues: unknown;
  heroAgeRange?: string | null;
  supportingCast?: unknown;
  artStyleLabel?: string | null;
  includePhotoAlbum?: boolean;
  quantity?: number;
  templateTitle: string;
  templateCustomFields: unknown;
  templateCastRoles?: unknown;
  characterLabelsById: Map<string, string>;
}): OrderOptionLine[] {
  const lines: OrderOptionLine[] = [];
  const characterIds = parseIdList(input.selectedCharacterIds);
  const heroLabel = characterIds[0]
    ? input.characterLabelsById.get(characterIds[0])
    : undefined;
  if (heroLabel) {
    lines.push({ label: "주인공", value: heroLabel });
  }

  const age = heroAgeRangeLabel(input.heroAgeRange);
  if (age) {
    lines.push({ label: "나이", value: age });
  }

  if (input.artStyleLabel?.trim()) {
    lines.push({ label: "그림체", value: input.artStyleLabel.trim() });
  }

  if (input.includePhotoAlbum) {
    lines.push({ label: "사진첩", value: "추가" });
  }

  if (input.quantity && input.quantity > 0) {
    lines.push({ label: "수량", value: `${input.quantity}권` });
  }

  const roles = parseCastRoles(input.templateCastRoles, input.templateTitle);
  const extras = parseSupportingCast(input.supportingCast);
  if (extras.length === 0) {
    lines.push({ label: "추가 등장", value: "없음" });
  } else {
    lines.push({
      label: "추가 등장",
      value: extras
        .map((member) => {
          const name = input.characterLabelsById.get(member.characterId) ?? "";
          const role = castRoleLabel(roles, member.relationKey);
          return name && name !== role ? `${role} · ${name}` : role;
        })
        .join(", "),
    });
  }

  const values = parseStringRecord(input.customInputValues);
  for (const field of parseCustomFields(input.templateCustomFields)) {
    const raw = values[field.key]?.trim();
    if (!raw) {
      continue;
    }
    lines.push({
      label: optionFieldShortLabel(field.key, field.label),
      value: customFieldDisplayValue(field, raw),
    });
  }

  return lines;
}

function optionFieldShortLabel(key: string, fallback: string) {
  if (key === "favorite_color") {
    return "색깔";
  }
  if (key === "favorite_animal") {
    return "동물";
  }
  return fallback.replace(/\s*(은|는)\s+.+$/u, "").trim() || fallback;
}
