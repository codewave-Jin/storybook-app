import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { CharacterCreateForm } from "@/components/CharacterCreateForm";
import { DashboardShell } from "@/components/DashboardShell";
import { prisma } from "@/lib/prisma";
import { getCharacterSlotAndTokens, getOrCreateTodayFreeTokens } from "@/lib/tokens";

export default async function NewCharacterPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard/characters/new");
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!existingUser) {
    await signOut({
      redirectTo: "/login?callbackUrl=/dashboard/characters/new",
    });
  }

  await getOrCreateTodayFreeTokens(userId);

  const { slot, tokens } = await getCharacterSlotAndTokens(userId);

  return (
    <DashboardShell title="캐릭터 추가">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-stone-500 underline-offset-4 hover:underline"
      >
        ← 대시보드로
      </Link>

      <div className="mx-auto mt-4 w-full max-w-lg">
        <div className="mb-4 rounded-full bg-white px-4 py-2 text-sm font-medium ring-1 ring-stone-200">
          현재 토큰: {tokens}개
        </div>

        {slot.canCreate ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
            <CharacterCreateForm tokenBalance={tokens} isLoggedIn />
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
            <p className="font-medium">슬롯이 가득 찼습니다. 캐릭터를 삭제해주세요</p>
            <p className="mt-2 text-sm text-stone-500">
              현재 {slot.current}/{slot.limit}개를 사용 중입니다.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-sky-400 px-5 text-sm font-medium text-white"
            >
              대시보드로 돌아가기
            </Link>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
