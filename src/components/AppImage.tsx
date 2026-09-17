import Image, { type ImageProps } from "next/image";
import {
  toProtectedMediaSrc,
  type MediaVariant,
} from "@/lib/media-paths";
import { cn } from "@/lib/utils";

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
  fill,
  className,
  sizes,
  draggable,
  width,
  height,
  style,
  onContextMenu,
  ...props
}: AppImageProps) {
  const resolved =
    typeof src === "string" ? toProtectedMediaSrc(src, mediaVariant) : src;
  const skipOptimizer = unoptimized ?? shouldSkipOptimizer(resolved);

  if (typeof resolved === "string" && skipOptimizer) {
    return (
      // Cookie-authenticated and remote blob images must not go through /_next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={alt}
        width={typeof width === "number" ? width : undefined}
        height={typeof height === "number" ? height : undefined}
        draggable={draggable ?? false}
        style={style}
        onContextMenu={onContextMenu}
        className={cn(fill ? "absolute inset-0 h-full w-full" : null, className)}
      />
    );
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      fill={fill}
      sizes={sizes}
      width={width}
      height={height}
      style={style}
      draggable={draggable}
      onContextMenu={onContextMenu}
      className={className}
      unoptimized={skipOptimizer}
      {...props}
    />
  );
}
