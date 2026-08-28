import type { Metadata } from "next";
import { auth } from "@/auth";
import { CharacterFloatingBanner } from "@/components/home/CharacterFloatingBanner";
import { HomeLanding } from "@/components/home/HomeLanding";

export const metadata: Metadata = {
  title: "판바기 | 우리 가족의 얼굴로 만드는 맞춤 동화책",
  description:
    "사진 한 장이면 충분해요. 엄마, 아빠, 아이가 주인공이 됩니다.",
};

export default async function HomePage() {
  const session = await auth();

  return (
    <>
      <HomeLanding isLoggedIn={Boolean(session?.user)} />
      <CharacterFloatingBanner />
    </>
  );
}
