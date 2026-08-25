export function PreviewWatermark({ text = "스토리북" }: { text?: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <div className="absolute left-1/2 top-1/2 flex w-[240%] -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] flex-wrap content-center justify-center gap-x-10 gap-y-12 opacity-[0.15]">
        {Array.from({ length: 48 }, (_, index) => (
          <span
            key={index}
            className="whitespace-nowrap text-xl font-semibold tracking-wide text-stone-900 sm:text-2xl"
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
