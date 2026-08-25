import Image, { type ImageProps } from "next/image";

function shouldSkipOptimizer(src: ImageProps["src"]) {
  if (typeof src !== "string") {
    return false;
  }

  return /^https?:\/\//i.test(src) || /\.svg(?:$|\?)/i.test(src);
}

export function AppImage({ src, unoptimized, ...props }: ImageProps) {
  return (
    <Image
      src={src}
      unoptimized={unoptimized ?? shouldSkipOptimizer(src)}
      {...props}
    />
  );
}
