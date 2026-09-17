import Image, { type ImageProps } from "next/image";
import {
  toProtectedMediaSrc,
  type MediaVariant,
} from "@/lib/media-paths";

type AppImageProps = ImageProps & {
  mediaVariant?: MediaVariant;
};

function shouldSkipOptimizer(src: ImageProps["src"]) {
  if (typeof src !== "string") {
    return false;
  }

  return (
    src.startsWith("/api/media") ||
    /^https?:\/\//i.test(src) ||
    /\.svg(?:$|\?)/i.test(src)
  );
}

export function AppImage({
  src,
  alt = "",
  unoptimized,
  mediaVariant = "preview",
  ...props
}: AppImageProps) {
  const resolved =
    typeof src === "string" ? toProtectedMediaSrc(src, mediaVariant) : src;

  return (
    <Image
      src={resolved}
      alt={alt}
      unoptimized={unoptimized ?? shouldSkipOptimizer(resolved)}
      {...props}
    />
  );
}
