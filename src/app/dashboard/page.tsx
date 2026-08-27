import type { Character, PaymentStatus, ProductionStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AddCharacterSlot, CharacterCard } from "@/components/CharacterCard";
import { DashboardCreateActions } from "@/components/DashboardCreateActions";
import { IntervalRefresher } from "@/components/IntervalRefresher";
import { DashboardShell } from "@/components/DashboardShell";
import { characterStatusPayload } from "@/lib/generation-status";
import { PRODUCTION_STATUS_LABEL, formatDateTime } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { FREE_TOKEN_DAILY_MAX, getOrCreateTodayFreeTokens } from "@/lib/tokens";

const PRODUCTION_BADGE: Record<ProductionStatus, string> = {
  WAITING: "bg-[#F6E7C1] text-[#8A5A12]",
  ILLUSTRATING: "bg-[#FDE8E0] text-[#E07A5F]",
  UPSCALING: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
};

function StatCard({
  label,
  value,
  max,
  accent,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  accent: "yellow" | "coral";
  hint?: string;
}) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const track = accent === "yellow" ? "bg-[#F6E7C1]" : "bg-[#FDE8E0]";
  const fill = accent === "yellow" ? "bg-[#E8C84A]" : "bg-[#E07A5F]";
  const tint =
    accent === "yellow"
      ? "bg-[#FDF8EA] ring-[#E8C84A]/40"
      : "bg-[#FFF6F3] ring-[#E07A5F]/25";

  return (
    <div className={`rounded-2xl p-4 shadow-sm ring-1 ${tint}`}>
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-stone-800">
        {value}
        <span className="text-base font-medium text-stone-400">/{max}</span>
      </p>
      <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${track}`}>
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${Math.max(ratio * 100, value > 0 ? 8 : 0)}%` }}
        />
      </div>
      {hint ? <p className="mt-2 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

function RecentOrders({
  orders,
}: {
  orders: Array<{
    id: string;
    paymentStatus: PaymentStatus;
    productionStatus: ProductionStatus;
    createdAt: Date;
    title: string;
  }>;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-stone-800">최근 동화책</h2>
      {orders.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white px-4 py-8 text-center text-sm text-stone-500 ring-1 ring-stone-200">
          아직 만든 동화책이 없습니다
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={
                  order.paymentStatus === "PAID"
                    ? `/dashboard/orders/${order.id}`
                    : `/dashboard/orders/${order.id}/preview`
                }
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200 transition hover:bg-sky-50/70 hover:ring-sky-200"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-800">
                    {order.title}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${PRODUCTION_BADGE[order.productionStatus]}`}
                >
                  {PRODUCTION_STATUS_LABEL[order.productionStatus]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CharacterGrid({
  characters,
  canCreate,
  addHref,
}: {
  characters: Character[];
  canCreate: boolean;
  addHref: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-stone-800">내 캐릭터</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {characters.map((character) => (
          <CharacterCard key={character.id} character={character} />
        ))}
        {canCreate ? <AddCharacterSlot href={addHref} /> : null}
      </div>
      {!canCreate ? (
        <p className="mt-3 text-center text-sm font-medium text-[#E07A5F]">
          슬롯이 가득 찼습니다. 캐릭터를 삭제해주세요
        </p>
      ) : null}
    </section>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <DashboardShell title="대시보드">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="오늘 무료 토큰"
            value={0}
            max={FREE_TOKEN_DAILY_MAX}
            accent="yellow"
          />
          <StatCard
            label="캐릭터 슬롯"
            value={0}
            max={5}
            accent="coral"
          />
        </div>
        <CharacterGrid
          characters={[]}
          canCreate
          addHref="/login?callbackUrl=/dashboard/characters/new"
        />
        <p className="mt-4 text-center text-sm text-stone-500">
          사진을 올리면 동화 속 주인공을 만들 수 있어요. 생성할 때 로그인이
          필요합니다.
        </p>
      </DashboardShell>
    );
  }

  await getOrCreateTodayFreeTokens(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      characterSlotLimit: true,
      tokenBalance: { select: { freeBalance: true } },
      characters: { orderBy: { createdAt: "desc" } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          paymentStatus: true,
          productionStatus: true,
          createdAt: true,
          template: { select: { title: true } },
        },
      },
    },
  });

  // DB 교체 등으로 세션 userId가 더 이상 없으면 재로그인 유도
  if (!user) {
    redirect("/api/auth/force-logout?callbackUrl=/login%3FcallbackUrl%3D%2Fdashboard");
  }
  const characters = user?.characters ?? [];
  const limit = user?.characterSlotLimit ?? 5;
  const freeTokens = user?.tokenBalance?.freeBalance ?? 0;
  const canCreate = characters.length < limit;
  const hasCompleted = characters.some(
    (character) => character.status === "COMPLETED",
  );
  const waitingForGeneration = characters.some(
    (character) =>
      character.status === "PENDING" || character.status === "PROCESSING",
  );
  const orders = (user?.orders ?? []).map((order) => ({
    id: order.id,
    paymentStatus: order.paymentStatus,
    productionStatus: order.productionStatus,
    createdAt: order.createdAt,
    title: order.template.title,
  }));

  return (
    <DashboardShell title="대시보드">
      <IntervalRefresher
        active={waitingForGeneration}
        href="/api/characters/status"
        initialSignature={JSON.stringify(characterStatusPayload(characters))}
      />
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="오늘 무료 토큰"
          value={freeTokens}
          max={FREE_TOKEN_DAILY_MAX}
          accent="yellow"
        />
        <StatCard
          label="캐릭터 슬롯"
          value={characters.length}
          max={limit}
          accent="coral"
        />
      </div>

      <CharacterGrid
        characters={characters}
        canCreate={canCreate}
        addHref="/dashboard/characters/new"
      />

      {hasCompleted ? <DashboardCreateActions /> : null}

      <RecentOrders orders={orders} />
    </DashboardShell>
  );
}
