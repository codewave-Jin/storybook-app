export function PreviewWatermark({
  text = "판바기",
  url = "www.panbagi.co.kr",
}: {
  text?: string;
  url?: string;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
    >
      <span className="flex flex-col items-center text-center text-black/45 drop-shadow-[0_1px_1px_rgba(255,255,255,0.65)]">
        <span className="text-3xl font-bold tracking-wide sm:text-4xl">
          {text}
        </span>
        <span className="mt-0.5 text-sm font-semibold tracking-wide sm:text-base">
          {url}
        </span>
      </span>
    </div>
  );
}
