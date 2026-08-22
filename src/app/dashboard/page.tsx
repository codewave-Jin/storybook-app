import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CharacterCard } from "@/components/CharacterCard";
import { IntervalRefresher } from "@/components/IntervalRefresher";
import { DashboardShell } from "@/components/DashboardShell";
import { characterStatusPayload } from "@/lib/generation-status";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodayFreeTokens } from "@/lib/tokens";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  await getOrCreateTodayFreeTokens(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      characterSlotLimit: true,
      tokenBalance: { select: { freeBalance: true, paidBalance: true } },
      characters: { orderBy: { createdAt: "desc" } },
    },
  });

  const characters = user?.characters ?? [];
  const limit = user?.characterSlotLimit ?? 5;
  const tokens =
    (user?.tokenBalance?.freeBalance ?? 0) +
    (user?.tokenBalance?.paidBalance ?? 0);
  const slot = {
    canCreate: characters.length < limit,
    current: characters.length,
    limit,
  };
  const waitingForGeneration = characters.some(
    (character) =>
      character.status === "PENDING" || character.status === "PROCESSING",
  );

  return (
    <DashboardShell title="대시보드">
      <IntervalRefresher
        active={waitingForGeneration}
        href="/api/characters/status"
        initialSignature={JSON.stringify(characterStatusPayload(characters))}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-white px-3 py-1.5 font-medium ring-1 ring-stone-200">
            토큰: {tokens}개
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 font-medium ring-1 ring-stone-200">
            캐릭터: {slot.current}/{slot.limit}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {slot.canCreate ? (
            <Link
              href="/dashboard/characters/new"
              className="flex h-11 items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800"
            >
              캐릭터 추가하기
            </Link>
          ) : (
            <p className="self-center text-sm font-medium text-red-600">
              슬롯이 가득 찼습니다. 캐릭터를 삭제해주세요
            </p>
          )}
          <Link
            href="/dashboard/order/new"
            className="flex h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-5 text-sm font-medium hover:bg-stone-50"
          >
            동화책 주문하기
          </Link>
        </div>
      </div>

      {characters.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
          <p className="font-medium">아직 만든 캐릭터가 없습니다</p>
          <p className="mt-1 text-sm text-stone-500">
            사진을 올리면 동화 속 주인공을 만들 수 있어요.
          </p>
        </div>
      ) : (
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {characters.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </section>
      )}
    </DashboardShell>
  );
}
