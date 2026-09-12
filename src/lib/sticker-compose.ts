import { loadImageAsset } from "@/lib/openai-illustration";
import { persistStickerCompositeBuffer } from "@/lib/sticker-composite";
import { clearStickerCharacterBackground } from "@/lib/sticker-cutout";
import {
  DEFAULT_STICKER_LAYOUT,
  clampStickerLayout,
  isAllowedStickerAssetPath,
  type StickerLayoutState,
} from "@/lib/sticker-layout-constants";
import { compositeLayoutSticker } from "@/lib/sticker-layout";
import { persistGeneratedStickerBuffer, toAbsolutePublicPath } from "@/lib/uploads";

export async function composeStickerPreviewImage(options: {
  userId: string;
  orderId?: string;
  characterImagePath: string;
  borderImageUrl: string;
  phrase: string;
  layout?: StickerLayoutState;
  cutoutImagePath?: string;
  cutoutOnly?: boolean;
}) {
  const layout = clampStickerLayout(options.layout ?? DEFAULT_STICKER_LAYOUT);
  const reusedCutout =
    options.cutoutImagePath && isAllowedStickerAssetPath(options.cutoutImagePath)
      ? options.cutoutImagePath
      : "";

  let cutoutBytes: Buffer;
  let cutoutImagePath = reusedCutout;

  if (reusedCutout) {
    cutoutBytes = (await loadImageAsset(reusedCutout)).bytes;
  } else {
    const portraitAsset = await loadImageAsset(options.characterImagePath);
    cutoutBytes = await clearStickerCharacterBackground(
      toAbsolutePublicPath(options.characterImagePath),
      portraitAsset.bytes,
    );
    cutoutImagePath = await persistGeneratedStickerBuffer(cutoutBytes, "image/png");
  }

  if (options.cutoutOnly) {
    return {
      imagePath: cutoutImagePath,
      compositePath: cutoutImagePath,
      cutoutImagePath,
      layout,
    };
  }

  const borderAsset = await loadImageAsset(options.borderImageUrl);
  const previewBytes = await compositeLayoutSticker({
    borderBytes: borderAsset.bytes,
    characterBytes: cutoutBytes,
    phrase: options.phrase,
    layout,
  });

  const imagePath = await persistGeneratedStickerBuffer(previewBytes, "image/png");
  const compositePath = options.orderId
    ? await persistStickerCompositeBuffer(previewBytes, {
        userId: options.userId,
        orderId: options.orderId,
      })
    : imagePath;

  return { imagePath, compositePath, cutoutImagePath, layout };
}
