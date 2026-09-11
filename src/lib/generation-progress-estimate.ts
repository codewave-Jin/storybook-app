export type GenerationProgressKind = "character" | "illustration" | "sticker";

/**
 * Time-based percent while the provider does not stream real progress.
 * GPT page images often finish around 70–120s; the curve sits near 85% by then
 * so completion does not jump from ~50% to 100%.
 */
export function estimatedGenerationPercent(
  elapsedSec: number,
  kind: GenerationProgressKind,
) {
  const elapsed = Math.max(0, elapsedSec);
  if (kind === "character") {
    return Math.min(90, Math.round(8 + elapsed * 2.2));
  }

  const tau = 38;
  return Math.min(90, Math.round(12 + 78 * (1 - Math.exp(-elapsed / tau))));
}
