export const CHARACTER_OUTFIT_OPTIONS = [
  { key: "default", label: "기본" },
  { key: "angel", label: "천사" },
  { key: "princess", label: "공주" },
  { key: "prince", label: "왕자" },
] as const;

export type CharacterOutfitKey = (typeof CHARACTER_OUTFIT_OPTIONS)[number]["key"];

export type CharacterOutfitSpec = {
  prompt: string;
  seedPrimary: number;
  seedSecondary: number;
};

const OUTFIT_SPECS: Partial<
  Record<`${CharacterOutfitKey}:${"MALE" | "FEMALE"}`, CharacterOutfitSpec>
> = {
  "angel:FEMALE": {
    prompt: "girl,black hair,baby angel, 2years old,",
    seedPrimary: 856384309319198,
    seedSecondary: 745549027479876,
  },
  "angel:MALE": {
    prompt: "boy,black hair,baby angel, 2years old,",
    seedPrimary: 856384309319198,
    seedSecondary: 745549027479876,
  },
  "princess:FEMALE": {
    prompt: "girl,black longwave hair,pink baby princess, 2years old,",
    seedPrimary: 856384309319198,
    seedSecondary: 745549027479876,
  },
  "princess:MALE": {
    prompt: "girl,black longwave hair,pink baby princess, 2years old,",
    seedPrimary: 856384309319198,
    seedSecondary: 745549027479876,
  },
  "prince:MALE": {
    prompt: "boy,black hair,The little prince, 2years old, crown",
    seedPrimary: 547828900274437,
    seedSecondary: 511205165181997,
  },
  "prince:FEMALE": {
    prompt: "girl,black hair,The little prince, 2years old, crown",
    seedPrimary: 547828900274437,
    seedSecondary: 511205165181997,
  },
};

export function isCharacterOutfitKey(value: string): value is CharacterOutfitKey {
  return CHARACTER_OUTFIT_OPTIONS.some((option) => option.key === value);
}

export function isDefaultCharacterOutfit(outfit: string) {
  return outfit === "default";
}

export function getCharacterOutfitSpec(
  outfit: string,
  gender: "MALE" | "FEMALE",
): CharacterOutfitSpec | undefined {
  if (!isCharacterOutfitKey(outfit) || isDefaultCharacterOutfit(outfit)) {
    return undefined;
  }
  return OUTFIT_SPECS[`${outfit}:${gender}`];
}

export function isCharacterOutfitReady(
  outfit: string,
  gender: "MALE" | "FEMALE",
) {
  if (!isCharacterOutfitKey(outfit)) {
    return false;
  }
  if (isDefaultCharacterOutfit(outfit)) {
    return true;
  }
  return Boolean(getCharacterOutfitSpec(outfit, gender));
}
