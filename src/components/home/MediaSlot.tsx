import { cn } from "@/lib/utils";

type FaceKind = "child" | "mom" | "dad";
type SlotTone = "photo" | "art";

type MediaSlotProps = {
  src?: string | null;
  alt: string;
  label: string;
  kind?: FaceKind;
  tone?: SlotTone;
  showLabel?: boolean;
  className?: string;
};

const FACE_COLORS: Record<FaceKind, { skin: string; hair: string; shirt: string }> = {
  child: { skin: "#F3D0B5", hair: "#6B3E2A", shirt: "#F2A3B0" },
  mom: { skin: "#E8C4A8", hair: "#3F2A1E", shirt: "#D9A48A" },
  dad: { skin: "#E2C09A", hair: "#2C241E", shirt: "#7E9AA8" },
};

function FaceIllustration({ kind, tone }: { kind: FaceKind; tone: SlotTone }) {
  const colors = FACE_COLORS[kind];
  const eye = tone === "art" ? 5.2 : 3.4;
  const smile = tone === "art" ? "M34 62c6 8 18 8 24 0" : "M38 64c4 5 12 5 16 0";

  return (
    <svg viewBox="0 0 92 110" className="h-[72%] w-auto" aria-hidden>
      <ellipse cx="46" cy="104" rx="28" ry="10" fill={colors.shirt} />
      <path
        d="M18 92c4-18 12-28 28-28s24 10 28 28"
        fill={colors.shirt}
      />
      {kind === "dad" ? (
        <path d="M22 38c2-18 12-28 24-28s22 10 24 28H22z" fill={colors.hair} />
      ) : kind === "mom" ? (
        <path
          d="M16 48c2-24 12-38 30-38s28 14 30 38c-6-10-16-14-30-14S22 38 16 48z"
          fill={colors.hair}
        />
      ) : (
        <path d="M20 42c3-20 12-30 26-30s23 10 26 30H20z" fill={colors.hair} />
      )}
      <circle cx="46" cy="52" r="24" fill={colors.skin} />
      {tone === "art" ? (
        <>
          <circle cx="38" cy="50" r={eye} fill="#3F322C" />
          <circle cx="54" cy="50" r={eye} fill="#3F322C" />
          <circle cx="36.5" cy="48.5" r="1.4" fill="white" />
          <circle cx="52.5" cy="48.5" r="1.4" fill="white" />
        </>
      ) : (
        <>
          <ellipse cx="38" cy="51" rx="3.2" ry="3.6" fill="#3F322C" />
          <ellipse cx="54" cy="51" rx="3.2" ry="3.6" fill="#3F322C" />
        </>
      )}
      <path d={smile} fill="none" stroke="#C2786A" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function MediaSlot({
  src,
  alt,
  label,
  kind = "child",
  tone = "photo",
  showLabel = true,
  className,
}: MediaSlotProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  const backdrop =
    tone === "art"
      ? "from-[#F8E7C8] via-[#F3D7B4] to-[#E8C49A]"
      : "from-[#EFE4D8] via-[#E5D3C4] to-[#D8C2B0]";

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-end overflow-hidden bg-gradient-to-b",
        backdrop,
        className,
      )}
      aria-label={alt}
      data-media-slot={label}
    >
      <FaceIllustration kind={kind} tone={tone} />
      {showLabel ? (
        <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-[#6B5348] shadow-sm">
          {label}
        </span>
      ) : null}
    </div>
  );
}
