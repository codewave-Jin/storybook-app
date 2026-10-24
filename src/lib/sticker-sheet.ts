export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export type StickerSheetKind = "small" | "medium" | "large";

export type StickerSheetSpec = {
  kind: StickerSheetKind;
  match: (label: string) => boolean;
  label: string;
  diameterMm: number;
  cols: number;
  rows: number;
  gapMm: number;
  selectable: boolean;
};

export const STICKER_SHEET_SPECS: StickerSheetSpec[] = [
  {
    kind: "small",
    match: (label) => label.startsWith("소형"),
    label: "소형 (38.1mm)",
    diameterMm: 38.1,
    cols: 4,
    rows: 6,
    gapMm: 6,
    selectable: true,
  },
  {
    kind: "medium",
    match: (label) => label.startsWith("중형"),
    label: "중형 (50mm)",
    diameterMm: 50,
    cols: 3,
    rows: 4,
    gapMm: 6,
    selectable: false,
  },
  {
    kind: "large",
    match: (label) => label.startsWith("대형"),
    label: "대형 (200mm)",
    diameterMm: 200,
    cols: 1,
    rows: 1,
    gapMm: 0,
    selectable: true,
  },
];

export function stickerSheetSpec(label: string) {
  return STICKER_SHEET_SPECS.find((item) => item.match(label)) ?? null;
}

export function isStickerSizeSelectable(label: string) {
  return stickerSheetSpec(label)?.selectable ?? false;
}

export function isDefaultStickerSize(label: string) {
  return stickerSheetSpec(label)?.kind === "small";
}

export function stickerSizeDisplayMm(label: string, fallbackMm: number) {
  const spec = stickerSheetSpec(label);
  if (!spec) {
    return fallbackMm;
  }
  return Number.isInteger(spec.diameterMm)
    ? spec.diameterMm
    : Number(spec.diameterMm.toFixed(1));
}

export type StickerSheetCell = {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
};

export function stickerSheetCells(label: string, fallbackCount: number): StickerSheetCell[] {
  const spec = stickerSheetSpec(label);
  if (!spec) {
    return fallbackSheetCells(fallbackCount);
  }

  const diameter = spec.diameterMm;
  const gridWidth = spec.cols * diameter + Math.max(0, spec.cols - 1) * spec.gapMm;
  const gridHeight = spec.rows * diameter + Math.max(0, spec.rows - 1) * spec.gapMm;
  const originX = (A4_WIDTH_MM - gridWidth) / 2;
  const originY = (A4_HEIGHT_MM - gridHeight) / 2;
  const cells: StickerSheetCell[] = [];

  for (let row = 0; row < spec.rows; row += 1) {
    for (let col = 0; col < spec.cols; col += 1) {
      const x = originX + col * (diameter + spec.gapMm);
      const y = originY + row * (diameter + spec.gapMm);
      cells.push({
        leftPct: (x / A4_WIDTH_MM) * 100,
        topPct: (y / A4_HEIGHT_MM) * 100,
        widthPct: (diameter / A4_WIDTH_MM) * 100,
        heightPct: (diameter / A4_HEIGHT_MM) * 100,
      });
    }
  }

  return cells;
}

function fallbackSheetCells(count: number): StickerSheetCell[] {
  const cols = count <= 1 ? 1 : count <= 6 ? 2 : count <= 12 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(count / cols));
  const cells: StickerSheetCell[] = [];
  for (let index = 0; index < count; index += 1) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    cells.push({
      leftPct: (col / cols) * 100,
      topPct: (row / rows) * 100,
      widthPct: 100 / cols,
      heightPct: 100 / rows,
    });
  }
  return cells;
}
