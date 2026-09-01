export function PreviewWatermark({
  text = "판바기",
  url = "www.panbagi.co.kr",
  note = "결제시 워터마크는 사라집니다",
  compact = false,
  placement = "center",
}: {
  text?: string;
  url?: string;
  note?: string;
  compact?: boolean;
  /** center: middle of image; bottom: horizontally centered near the bottom */
  placement?: "center" | "bottom";
}) {
  return (
    <div
      aria-hidden
      className={
        placement === "bottom"
          ? "pointer-events-none absolute inset-x-0 bottom-[10%] flex justify-center select-none"
          : "pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      }
    >
      <span className="flex flex-col items-center px-1 text-center text-black/45 drop-shadow-[0_1px_1px_rgba(255,255,255,0.65)]">
        <span
          className={
            compact
              ? "text-[11px] font-bold tracking-wide sm:text-sm"
              : "text-3xl font-bold tracking-wide sm:text-4xl"
          }
        >
          {text}
        </span>
        <span
          className={
            compact
              ? "mt-0.5 text-[8px] font-semibold tracking-wide sm:text-[10px]"
              : "mt-0.5 text-sm font-semibold tracking-wide sm:text-base"
          }
        >
          {url}
        </span>
        <span
          className={
            compact
              ? "mt-0.5 text-[6px] font-medium tracking-wide sm:text-[8px]"
              : "mt-1 text-[10px] font-medium tracking-wide sm:text-xs"
          }
        >
          {note}
        </span>
      </span>
    </div>
  );
}
