import Image, { type ImageProps } from "next/image";

function isRemoteSrc(src: ImageProps["src"]) {
  return typeof src === "string" && /^https?:\/\//i.test(src);
}

export function AppImage({ src, unoptimized, ...props }: ImageProps) {
  return (
    <Image src={src} unoptimized={unoptimized ?? isRemoteSrc(src)} {...props} />
  );
}
