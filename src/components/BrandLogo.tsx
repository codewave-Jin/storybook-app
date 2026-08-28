import Link from "next/link";
import { AppImage } from "@/components/AppImage";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  className?: string;
  /** full: 가로형 풀로고, icon: 캐릭터 아이콘만 */
  variant?: "full" | "icon";
  /** sm: 헤더, md: 푸터, lg: 로그인 */
  size?: "sm" | "md" | "lg";
  priority?: boolean;
};

const FULL_HEIGHT: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  sm: "h-12 sm:h-14",
  md: "h-16",
  lg: "h-20 sm:h-24",
};

const ICON_SIZE: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export function BrandLogo({
  href = "/",
  className,
  variant = "full",
  size = "md",
  priority = false,
}: BrandLogoProps) {
  const image =
    variant === "icon" ? (
      <span
        className={cn(
          "relative inline-block shrink-0 overflow-hidden rounded-full",
          ICON_SIZE[size],
          className,
        )}
      >
        <AppImage
          src="/brand/panbagi-icon.png"
          alt="판바기"
          width={128}
          height={128}
          className="h-full w-full object-cover"
          sizes="64px"
          priority={priority}
        />
      </span>
    ) : (
      <span
        className={cn(
          "relative inline-block w-auto max-w-full",
          FULL_HEIGHT[size],
          className,
        )}
      >
        <AppImage
          src="/brand/panbagi-logo.png"
          alt="판바기 — 사진 속 우리가, 캐릭터로!"
          width={1006}
          height={376}
          className="h-full w-auto max-w-[min(100%,360px)] object-contain object-left sm:max-w-[420px]"
          sizes="(max-width: 640px) 300px, 420px"
          priority={priority}
        />
      </span>
    );

  if (!href) {
    return image;
  }

  return (
    <Link href={href} className="inline-flex items-center" aria-label="판바기 홈">
      {image}
    </Link>
  );
}
