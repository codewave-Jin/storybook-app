import { auth } from "@/auth";
import { CharacterFloatingBanner } from "@/components/home/CharacterFloatingBanner";
import { HomeLanding } from "@/components/home/HomeLanding";
import { getFeaturedLandingReviews } from "@/lib/landing-reviews";

export default async function Home() {
  const [session, reviews] = await Promise.all([
    auth(),
    getFeaturedLandingReviews(),
  ]);

  return (
    <>
      <HomeLanding
        isLoggedIn={Boolean(session?.user)}
        reviews={reviews}
      />
      <CharacterFloatingBanner />
    </>
  );
}
