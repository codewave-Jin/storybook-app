import Link from "next/link";
import { AppImage } from "@/components/AppImage";

/** Banner asset is 680×226 (~3:1). Keep natural ratio; no forced crop. */
export function CharacterFloatingBanner() {
  return (
    <Link
      href="/dashboard"
      aria-label="지금 무료로 캐릭터 생성해보기"
      className="fixed bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-2 right-2 z-[100] mx-auto block max-w-[400px] transition-transform duration-200 md:bottom-5 md:left-auto md:right-5 md:mx-0 md:w-[340px] md:max-w-none md:hover:scale-105"
    >
      <AppImage
        src="/banners/character-banner.png"
        alt="지금 무료로 캐릭터 생성해보기"
        width={680}
        height={226}
        className="h-auto w-full"
        sizes="(max-width: 767px) 100vw, 340px"
        priority
      />
    </Link>
  );
}
