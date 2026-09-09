import type { OrderOptionLine } from "@/lib/storybook-order-summary";
import { cn } from "@/lib/utils";

export function OrderOptionSummary({
  lines,
  className,
}: {
  lines: OrderOptionLine[];
  className?: string;
}) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <p
      className={cn(
        "mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-stone-500",
        className,
      )}
    >
      {lines.map((line) => (
        <span key={line.label} className="inline-flex max-w-full items-center gap-1">
          <span className="shrink-0 text-stone-400">{line.label}</span>
          <span className="truncate font-medium text-stone-600">{line.value}</span>
        </span>
      ))}
    </p>
  );
}
