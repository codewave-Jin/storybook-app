import { AppImage } from "@/components/AppImage";
import { stickerDecalByKey } from "@/lib/sticker-decals";
import { stickerFontByKey } from "@/lib/sticker-fonts";
import {
  DEFAULT_STICKER_LAYOUT,
  PHRASE_FONT_CANVAS_RATIO,
  decalIdFromLayerKey,
  decalLayerKey,
  normalizeStack,
  phraseIdFromLayerKey,
  phraseLayerKey,
  type StickerDecalLayer,
  type StickerLayerKey,
  type StickerLayoutState,
  type StickerPhraseLayer,
} from "@/lib/sticker-layout-constants";
import { stickerPhraseLines } from "@/lib/sticker-phrase";
import { cn } from "@/lib/utils";

function DashedFrame({ tight = false }: { tight?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded-xl border-2 border-dashed border-sky-400",
        tight ? "inset-0" : "inset-[6%]",
      )}
    />
  );
}

function PhraseLayer({
  phrase,
  index,
  selected,
  zIndex,
}: {
  phrase: StickerPhraseLayer;
  index: number;
  selected: boolean;
  zIndex: number;
}) {
  const font = stickerFontByKey(phrase.style.fontKey);
  const lines = stickerPhraseLines(phrase.text);
  const fontCqw = PHRASE_FONT_CANVAS_RATIO * 100 * phrase.style.scale;
  return (
    <div
      data-sticker-layer={phraseLayerKey(phrase.id)}
      aria-label={`문구${index + 1}`}
      className={cn(
        "absolute flex flex-col items-center justify-center overflow-visible text-center",
        selected ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
      )}
      style={{
        zIndex,
        left: `${phrase.box.leftRatio * 100}%`,
        top: `${phrase.box.topRatio * 100}%`,
        width: `${phrase.box.widthRatio * 100}%`,
        height: `${phrase.box.heightRatio * 100}%`,
        color: "#3D2A1C",
        fontFamily: font.cssFamily,
        fontWeight: font.cssWeight,
        wordBreak: "keep-all",
        letterSpacing: "0",
        textAlign: "center",
      }}
    >
      <div
        className="flex flex-col items-center justify-center leading-[1.2]"
        style={{ fontSize: `calc(${fontCqw}cqw)` }}
      >
        {lines.length > 0 ? (
          lines.map((line, lineIndex) => (
            <p
              key={`${lineIndex}-${line}`}
              className="m-0 whitespace-nowrap text-center"
              style={{ marginTop: lineIndex === 0 ? 0 : "0.28em" }}
            >
              {line}
            </p>
          ))
        ) : (
          <p className="m-0 whitespace-nowrap text-center text-stone-300">문구</p>
        )}
      </div>
      {selected ? <DashedFrame tight /> : null}
    </div>
  );
}

function DecalLayer({
  decal,
  index,
  selected,
  zIndex,
}: {
  decal: StickerDecalLayer;
  index: number;
  selected: boolean;
  zIndex: number;
}) {
  const asset = stickerDecalByKey(decal.assetKey);
  return (
    <div
      data-sticker-layer={decalLayerKey(decal.id)}
      aria-label={`스티커${index + 1}`}
      className={cn(
        "absolute overflow-visible",
        selected ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
      )}
      style={{
        zIndex,
        left: `${decal.box.leftRatio * 100}%`,
        top: `${decal.box.topRatio * 100}%`,
        width: `${decal.box.widthRatio * 100}%`,
        height: `${decal.box.heightRatio * 100}%`,
      }}
    >
      <img
        src={asset.src}
        alt={asset.label}
        draggable={false}
        className="pointer-events-none h-full w-full object-contain"
      />
      {selected ? <DashedFrame /> : null}
    </div>
  );
}

export function StickerLayoutPreview({
  borderSrc,
  characterSrc,
  layout = DEFAULT_STICKER_LAYOUT,
  selectedLayer,
  transparentCanvas = false,
}: {
  borderSrc?: string | null;
  characterSrc?: string | null;
  phrase?: string;
  layout?: StickerLayoutState;
  selectedLayer?: StickerLayerKey | null;
  transparentCanvas?: boolean;
}) {
  const character = layout.character;
  const border = layout.border;
  const stack = normalizeStack(layout);

  return (
    <div
      data-sticker-canvas
      className={cn(
        "relative mx-auto aspect-square w-full overflow-hidden rounded-full shadow-[0_0_0_3px_#fde68a,0_0_0_8px_#fdba74] select-none [container-type:size] [&_img]:pointer-events-none [&_img]:[-webkit-user-drag:none]",
        transparentCanvas
          ? "bg-[length:16px_16px] bg-[linear-gradient(45deg,#e7e5e4_25%,transparent_25%),linear-gradient(-45deg,#e7e5e4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e7e5e4_75%),linear-gradient(-45deg,transparent_75%,#e7e5e4_75%)] bg-[position:0_0,0_8px,8px_-8px,-8px_0] bg-white"
          : "bg-white",
      )}
    >
      {layout.borderVisible && selectedLayer === "border" ? (
        <div
          data-sticker-layer="border"
          aria-label="테두리"
          className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
        />
      ) : null}
      {stack.map((key, order) => {
        const zIndex = 10 + order;
        if (key === "character") {
          if (!layout.characterVisible || !characterSrc) {
            return null;
          }
          return (
            <div
              key={key}
              data-sticker-layer="character"
              aria-label="캐릭터"
              className={cn(
                "absolute overflow-visible",
                selectedLayer === "character"
                  ? "cursor-grab active:cursor-grabbing"
                  : "pointer-events-none",
              )}
              style={{
                zIndex,
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
          );
        }
        if (key === "border") {
          if (!layout.borderVisible || !borderSrc) {
            return null;
          }
          return (
            <div
              key={key}
              className="pointer-events-none absolute inset-0 origin-center"
              style={{
                zIndex,
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
          );
        }
        const phraseId = phraseIdFromLayerKey(key);
        if (phraseId) {
          const phraseIndex = layout.phrases.findIndex((item) => item.id === phraseId);
          const phrase = layout.phrases[phraseIndex];
          if (!phrase) {
            return null;
          }
          return (
            <PhraseLayer
              key={key}
              phrase={phrase}
              index={phraseIndex}
              selected={selectedLayer === key}
              zIndex={zIndex}
            />
          );
        }
        const decalId = decalIdFromLayerKey(key);
        if (decalId) {
          const decalIndex = layout.decals.findIndex((item) => item.id === decalId);
          const decal = layout.decals[decalIndex];
          if (!decal) {
            return null;
          }
          return (
            <DecalLayer
              key={key}
              decal={decal}
              index={decalIndex}
              selected={selectedLayer === key}
              zIndex={zIndex}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
