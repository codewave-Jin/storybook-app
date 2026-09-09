export function PreviewWatermark({
  text = "판바기",
  url = "www.panbagi.co.kr",
  note = "결제시 워터마크는 사라집니다",
  compact = false,
  size,
  placement = "bottom",
}: {
  text?: string;
  url?: string;
  note?: string;
  compact?: boolean;
  /** sm: smaller overlay for circular sticker preview. compact still wins if set. */
  size?: "sm" | "md";
  /** bottom: horizontally centered near the bottom; center: middle of image */
  placement?: "center" | "bottom";
}) {
  const scale = compact ? "compact" : size === "sm" ? "sm" : "md";
  const titleClass =
    scale === "compact"
      ? "text-[11px] font-bold tracking-wide sm:text-sm"
      : scale === "sm"
        ? "text-sm font-bold leading-tight tracking-wide sm:text-base"
        : "text-3xl font-bold tracking-wide sm:text-4xl";
  const urlClass =
    scale === "compact"
      ? "mt-0.5 text-[8px] font-semibold tracking-wide sm:text-[10px]"
      : scale === "sm"
        ? "mt-0.5 text-[9px] font-semibold leading-tight tracking-wide sm:text-[10px]"
        : "mt-0.5 text-sm font-semibold tracking-wide sm:text-base";
  const noteClass =
    scale === "compact"
      ? "mt-0.5 text-[6px] font-medium tracking-wide sm:text-[8px]"
      : scale === "sm"
        ? "mt-0.5 text-[8px] font-medium leading-tight tracking-wide"
        : "mt-1 text-[10px] font-medium tracking-wide sm:text-xs";
  const toneClass =
    scale === "sm"
      ? "text-black/30 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]"
      : "text-black/45 drop-shadow-[0_1px_1px_rgba(255,255,255,0.65)]";
  const positionClass =
    placement === "bottom"
      ? scale === "sm"
        ? "pointer-events-none absolute inset-x-0 bottom-[16%] z-[2] flex justify-center select-none"
        : "pointer-events-none absolute inset-x-0 bottom-[10%] z-[2] flex justify-center select-none"
      : "pointer-events-none absolute inset-0 z-[2] flex items-center justify-center select-none";

  return (
    <div aria-hidden className={positionClass}>
      <span className={`flex flex-col items-center px-2 text-center ${toneClass}`}>
        <span className={titleClass}>{text}</span>
        <span className={urlClass}>{url}</span>
        <span className={noteClass}>{note}</span>
      </span>
    </div>
  );
}
