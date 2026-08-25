import { auth } from "@/auth";
import { HomeLanding } from "@/components/home/HomeLanding";

export default async function Home() {
  const session = await auth();

  return <HomeLanding isLoggedIn={Boolean(session?.user)} />;
}
