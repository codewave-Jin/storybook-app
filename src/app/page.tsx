import { auth } from "@/auth";
import { CharacterFloatingBanner } from "@/components/home/CharacterFloatingBanner";
import { HomeLanding } from "@/components/home/HomeLanding";

export default async function Home() {
  const session = await auth();

  return (
    <>
      <HomeLanding isLoggedIn={Boolean(session?.user)} />
      <CharacterFloatingBanner />
    </>
  );
}
