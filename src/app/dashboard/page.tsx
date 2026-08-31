import type {
  Character,
  PaymentStatus,
  ProductionStatus,
  StickerPreviewStatus,
} from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AddCharacterSlot, CharacterCard } from "@/components/CharacterCard";
import { DashboardCreateActions } from "@/components/DashboardCreateActions";
import { DeleteDraftOrderButton } from "@/components/DeleteDraftOrderButton";
import { GenerationProgress } from "@/components/GenerationProgress";
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

const FAILED_BADGE = "bg-red-50 text-red-700";
const RECENT_WORK_LIMIT = 5;

type RecentWorkItem = {
  id: string;
  kind: "storybook" | "sticker";
  title: string;
  href: string;
  createdAt: Date;
  paymentStatus: PaymentStatus;
  statusLabel: string;
  statusClass: string;
  canDelete: boolean;
  generating?: {
    href: string;
    signature: string;
  };
};

function stickerWorkStatus(order: {
  previewStatus: StickerPreviewStatus;
  paymentStatus: PaymentStatus;
  productionStatus: ProductionStatus;
}): { label: string; badgeClass: string } {
  if (
    order.previewStatus === "IDLE" ||
    order.previewStatus === "PROCESSING"
  ) {
    return { label: "생성중", badgeClass: PRODUCTION_BADGE.ILLUSTRATING };
  }
  if (order.previewStatus === "FAILED") {
    return { label: "실패", badgeClass: FAILED_BADGE };
  }
  if (order.paymentStatus !== "PAID") {
    return {
      label: PRODUCTION_STATUS_LABEL.WAITING,
      badgeClass: PRODUCTION_BADGE.WAITING,
    };
  }
  return {
    label: PRODUCTION_STATUS_LABEL[order.productionStatus],
    badgeClass: PRODUCTION_BADGE[order.productionStatus],
  };
}

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
    <div className={`inline-flex shrink-0 flex-col rounded-lg px-2 py-1 ring-1 ${tint}`}>
      <div className="flex items-baseline gap-1.5 whitespace-nowrap">
        <p className="text-[11px] font-medium leading-none text-stone-500">
          {label}
        </p>
        <p className="text-sm font-semibold leading-none tabular-nums text-stone-800">
          {value}
          <span className="text-[11px] font-medium text-stone-400">/{max}</span>
        </p>
      </div>
      <div className={`mt-1 h-0.5 overflow-hidden rounded-full ${track}`}>
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${Math.max(ratio * 100, value > 0 ? 8 : 0)}%` }}
        />
      </div>
      {hint ? (
        <p className="mt-1 text-[10px] leading-tight text-stone-500">{hint}</p>
      ) : null}
    </div>
  );
}

function DashboardStats({
  freeTokens,
  slotUsed,
  slotMax,
}: {
  freeTokens: number;
  slotUsed: number;
  slotMax: number;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <StatCard
        label="오늘 무료 토큰"
        value={freeTokens}
        max={FREE_TOKEN_DAILY_MAX}
        accent="yellow"
      />
      <StatCard
        label="캐릭터 슬롯"
        value={slotUsed}
        max={slotMax}
        accent="coral"
      />
    </div>
  );
}

function RecentWork({ items }: { items: RecentWorkItem[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-stone-800">최근 작업</h2>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white px-4 py-8 text-center text-sm text-stone-500 ring-1 ring-stone-200">
          아직 작업이 없습니다
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex items-center gap-1 rounded-2xl bg-white pr-2 shadow-sm ring-1 ring-stone-200"
            >
              <Link
                href={item.href}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 transition hover:bg-sky-50/70"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        item.kind === "storybook"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-[#FDE8E0] text-[#E07A5F]"
                      }`}
                    >
                      {item.kind === "storybook" ? "동화책" : "스티커"}
                    </span>
                    <p className="truncate text-sm font-medium text-stone-800">
                      {item.title}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
                {item.generating && item.kind === "sticker" ? (
                  <GenerationProgress
                    kind="sticker"
                    id={item.id}
                    compact
                    startedAt={item.createdAt.getTime()}
                  />
                ) : (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${item.statusClass}`}
                  >
                    {item.statusLabel}
                  </span>
                )}
              </Link>
              {item.canDelete ? (
                <DeleteDraftOrderButton
                  compact
                  kind={item.kind}
                  orderId={item.id}
                  title={item.title}
                  redirectTo="/dashboard"
                />
              ) : null}
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
    <section>
      <h2 className="text-base font-semibold text-stone-800">내 캐릭터</h2>
      <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
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
      <DashboardShell
        title="대시보드"
        titleAccessory={
          <DashboardStats freeTokens={0} slotUsed={0} slotMax={5} />
        }
      >
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
        take: RECENT_WORK_LIMIT,
        select: {
          id: true,
          paymentStatus: true,
          productionStatus: true,
          createdAt: true,
          template: { select: { title: true } },
        },
      },
      stickerOrders: {
        orderBy: { createdAt: "desc" },
        take: RECENT_WORK_LIMIT,
        select: {
          id: true,
          paymentStatus: true,
          productionStatus: true,
          previewStatus: true,
          previewImagePath: true,
          errorReason: true,
          createdAt: true,
          phrase: true,
          character: { select: { label: true } },
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
  const recentWork: RecentWorkItem[] = [
    ...(user?.orders ?? []).map((order) => ({
      id: order.id,
      kind: "storybook" as const,
      title: order.template.title,
      href: `/dashboard/orders/${order.id}/preview`,
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus,
      statusLabel: PRODUCTION_STATUS_LABEL[order.productionStatus],
      statusClass: PRODUCTION_BADGE[order.productionStatus],
      canDelete: order.paymentStatus !== "PAID",
    })),
    ...(user?.stickerOrders ?? []).map((order) => {
      const status = stickerWorkStatus(order);
      const generating =
        order.previewStatus === "IDLE" || order.previewStatus === "PROCESSING";
      return {
        id: order.id,
        kind: "sticker" as const,
        title: `${order.character.label} · ${order.phrase}`,
        href: `/dashboard/sticker/${order.id}/preview`,
        createdAt: order.createdAt,
        paymentStatus: order.paymentStatus,
        statusLabel: status.label,
        statusClass: status.badgeClass,
        canDelete: order.paymentStatus !== "PAID",
        generating: generating
          ? {
              href: `/api/stickers/${order.id}/status`,
              signature: JSON.stringify({
                previewImagePath: order.previewImagePath,
                previewStatus: order.previewStatus,
                errorReason: order.errorReason,
              }),
            }
          : undefined,
      };
    }),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, RECENT_WORK_LIMIT);

  const generatingWork = recentWork.find((item) => item.generating);

  return (
    <DashboardShell
      title="대시보드"
      titleAccessory={
        <DashboardStats
          freeTokens={freeTokens}
          slotUsed={characters.length}
          slotMax={limit}
        />
      }
    >
      <IntervalRefresher
        active={waitingForGeneration}
        href="/api/characters/status"
        initialSignature={JSON.stringify(characterStatusPayload(characters))}
      />
      {generatingWork?.generating ? (
        <IntervalRefresher
          active
          href={generatingWork.generating.href}
          initialSignature={generatingWork.generating.signature}
        />
      ) : null}

      <CharacterGrid
        characters={characters}
        canCreate={canCreate}
        addHref="/dashboard/characters/new"
      />

      {hasCompleted ? <DashboardCreateActions /> : null}

      <RecentWork items={recentWork} />
    </DashboardShell>
  );
}
