import { AppImage } from "@/components/AppImage";
import { stickerFontByKey } from "@/lib/sticker-fonts";
import { parseStickerPhrase, stickerPhraseLines } from "@/lib/sticker-phrase";
import {
  DEFAULT_STICKER_LAYOUT,
  type StickerLayerKey,
  type StickerLayoutState,
} from "@/lib/sticker-layout-constants";

function DashedFrame({ circular = false }: { circular?: boolean }) {
  return (
    <div
      className={
        circular
          ? "pointer-events-none absolute inset-[3%] z-40 rounded-full border-2 border-dashed border-sky-400"
          : "pointer-events-none absolute inset-[6%] rounded-xl border-2 border-dashed border-sky-400"
      }
    />
  );
}

export function StickerLayoutPreview({
  borderSrc,
  characterSrc,
  phrase,
  layout = DEFAULT_STICKER_LAYOUT,
  selectedLayer,
}: {
  borderSrc?: string | null;
  characterSrc?: string | null;
  phrase: string;
  layout?: StickerLayoutState;
  selectedLayer?: StickerLayerKey | null;
}) {
  const { title, body } = parseStickerPhrase(phrase);
  const lines = stickerPhraseLines(body);
  const character = layout.character;
  const text = layout.text;
  const border = layout.border;
  const font = stickerFontByKey(layout.textStyle?.fontKey ?? "jua");
  const titleScale = layout.textStyle?.titleScale ?? 1;
  const bodyScale = layout.textStyle?.bodyScale ?? 1;

  return (
    <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-white shadow-[0_0_0_3px_#fde68a,0_0_0_8px_#fdba74] select-none [&_img]:pointer-events-none [&_img]:[-webkit-user-drag:none]">
      <div
        data-sticker-layer="border"
        aria-label="테두리 선택"
        className="absolute inset-0 z-0 cursor-pointer"
      />
      {characterSrc ? (
        <div
          data-sticker-layer="character"
          aria-label="캐릭터 선택"
          className="absolute z-10 cursor-grab overflow-visible active:cursor-grabbing"
          style={{
            left: `${character.leftRatio * 100}%`,
            top: `${character.topRatio * 100}%`,
            width: `${character.widthRatio * 100}%`,
            height: `${character.heightRatio * 100}%`,
          }}
        >
          <AppImage
            src={characterSrc}
            alt="캐릭터"
            fill
            unoptimized
            draggable={false}
            className="pointer-events-none object-contain"
            sizes="(max-width: 640px) 50vw, 16rem"
          />
          {selectedLayer === "character" ? <DashedFrame /> : null}
        </div>
      ) : null}
      <div
        data-sticker-layer="text"
        aria-label="문구 선택"
        className="absolute z-20 flex cursor-grab flex-col items-center overflow-hidden text-center [container-type:size] active:cursor-grabbing"
        style={{
          left: `${text.leftRatio * 100}%`,
          top: `${text.topRatio * 100}%`,
          width: `${text.widthRatio * 100}%`,
          height: `${text.heightRatio * 100}%`,
          color: "#3D2A1C",
          fontFamily: font.cssFamily,
          fontWeight: font.cssWeight,
          wordBreak: "keep-all",
          letterSpacing: "0",
        }}
      >
        <svg
          aria-hidden
          viewBox="0 0 62 38"
          className="mt-[2%] w-[18.6%] max-w-[3.5rem] shrink-0"
        >
          <g
            fill="none"
            stroke="#E8B84A"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path d="M5 31 L11 11 L22 24 L31 5 L40 24 L51 11 L57 31" />
          </g>
          <rect x="4" y="30" width="54" height="6" rx="2" fill="#E8B84A" />
        </svg>
        <p
          className="mt-[4%] leading-none"
          style={{ fontSize: `calc(${26 * titleScale}cqw)` }}
        >
          {title}
        </p>
        <div
          className="mt-[6%] flex w-full flex-col items-center gap-[0.35em] leading-snug"
          style={{ fontSize: `calc(${9.2 * bodyScale}cqw)` }}
        >
          {lines.map((line, index) => (
            <p key={`${index}-${line}`}>{line}</p>
          ))}
        </div>
        {selectedLayer === "text" ? <DashedFrame /> : null}
      </div>
      {borderSrc ? (
        <div
          className="pointer-events-none absolute inset-0 z-30 origin-center"
          style={{
            transform: `translate(${border.offsetXRatio * 100}%, ${border.offsetYRatio * 100}%) scale(${border.scale})`,
            transformOrigin: "center",
          }}
        >
          <AppImage
            src={borderSrc}
            alt="테두리"
            fill
            unoptimized
            draggable={false}
            className="pointer-events-none object-contain"
            sizes="(max-width: 640px) 80vw, 28rem"
          />
        </div>
      ) : null}
      {selectedLayer === "border" ? <DashedFrame circular /> : null}
    </div>
  );
}
