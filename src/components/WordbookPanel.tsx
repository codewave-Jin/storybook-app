"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppImage } from "@/components/AppImage";
import { PreviewWatermark } from "@/components/PreviewWatermark";
import { TokenConfirmDialog } from "@/components/StickerTokenConfirmDialog";
import { WordbookInstallGuideButton } from "@/components/wordbook/WordbookInstallGuide";
import { estimatedGenerationPercent } from "@/lib/generation-progress-estimate";
import { toProtectedMediaSrc } from "@/lib/media-paths";
import { WORDBOOK_FREE_REGEN, WORDBOOK_PRICE_TOKENS, formatTokens } from "@/lib/payments";
import { cn } from "@/lib/utils";
import { WORDBOOK_EXPRESSION_INFO, type WordbookExpression } from "@/lib/wordbook-prompt";

const STEPS = ["주인공 고르기", "표정 만들기", "확인·결제", "완성"];

function WordbookSteps({ current }: { current: number }) {
  return (
    <ol aria-label="진행 단계" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1",
              active ? "font-semibold text-stone-800 ring-2 ring-[#E07A5F]" : "text-stone-500 ring-sky-100",
              !active && !done && "bg-white/60",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                active ? "bg-[#E07A5F] text-white" : done ? "bg-sky-100 text-sky-700" : "bg-stone-100 text-stone-500",
              )}
            >
              {done ? "✓" : step}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export type WordbookCharacterOption = {
  id: string;
  label: string;
  imageSrc: string;
};

export function WordbookCreatePanel({
  characters,
  tokenBalance,
}: {
  characters: WordbookCharacterOption[];
  tokenBalance: number;
}) {
  const router = useRouter();
  const [characterId, setCharacterId] = useState<string | null>(characters[0]?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = characters.find((character) => character.id === characterId) ?? null;

  function requestStart() {
    if (!selected) {
      setError("주인공 캐릭터를 골라 주세요.");
      return;
    }
    if (tokenBalance < 1) {
      setError("토큰이 부족합니다");
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  async function start() {
    if (!selected || starting) {
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/wordbooks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: selected.id }),
      });
      const payload = (await response.json().catch(() => null)) as {
        orderId?: string;
        error?: string;
      } | null;
      if (!response.ok || !payload?.orderId) {
        setError(payload?.error ?? "단어 그림책을 시작하지 못했습니다.");
        setStarting(false);
        setConfirmOpen(false);
        return;
      }
      router.push(`/dashboard/wordbook/${payload.orderId}`);
    } catch {
      setError("단어 그림책을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setStarting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <WordbookSteps current={1} />

      {characters.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
          <p className="font-medium text-stone-800">완성된 캐릭터가 없어요</p>
          <p className="mt-1 text-sm text-stone-500">먼저 캐릭터를 만든 뒤 주인공으로 골라 주세요.</p>
          <Link
            href="/dashboard/characters/new"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-sky-400 px-5 text-sm font-semibold text-white"
          >
            캐릭터 만들러 가기
          </Link>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
          <section className="min-w-0 flex-1 rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-sky-100 sm:p-6">
            <h2 className="text-lg font-semibold text-stone-800">그림책 주인공을 골라 주세요</h2>
            <p className="mt-1 text-sm text-stone-500">
              저장된 캐릭터를 불러와요. 이 캐릭터로 표정 2가지를 더 그려요.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {characters.map((character) => {
                const active = character.id === characterId;
                return (
                  <button
                    key={character.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setCharacterId(character.id);
                      setError(null);
                    }}
                    className={cn(
                      "relative overflow-hidden rounded-2xl p-2 text-left ring-1 transition",
                      active ? "bg-[#FFF6F3] ring-2 ring-[#E07A5F]" : "bg-white ring-stone-200 hover:ring-sky-300",
                    )}
                  >
                    <span className="relative block aspect-square overflow-hidden rounded-xl bg-stone-100">
                      <AppImage src={character.imageSrc} alt={character.label} fill className="object-cover" sizes="200px" />
                    </span>
                    <span className="mt-2 block truncate px-1 text-sm font-semibold text-stone-800">
                      {character.label}
                    </span>
                    {active ? (
                      <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#E07A5F] text-xs font-bold text-white ring-2 ring-white">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="w-full rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-sky-100 lg:w-80">
            <p className="text-sm font-semibold text-sky-600">선택한 주인공</p>
            {selected ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="relative h-16 w-16 overflow-hidden rounded-2xl bg-stone-100">
                  <AppImage src={selected.imageSrc} alt="" fill className="object-cover" sizes="64px" />
                </span>
                <span className="text-lg font-bold text-stone-800">{selected.label}</span>
              </div>
            ) : null}
            <ul className="mt-4 space-y-1.5 text-sm text-stone-500">
              <li>· 기본 표정은 저장된 캐릭터 그대로 써요</li>
              <li>· 궁금한 표정, 놀란 표정 2가지를 새로 그려요</li>
              <li>· 배경과 동물·자동차 그림은 모든 책이 같아요</li>
            </ul>
            <button
              type="button"
              onClick={requestStart}
              disabled={!selected || starting}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[#E07A5F] text-sm font-semibold text-white hover:bg-[#d56c51] disabled:opacity-50"
            >
              이 캐릭터로 표정 만들기
            </button>
            <p className="mt-2 text-center text-xs text-stone-500">
              미리보기에 토큰 1개가 쓰이고, 결제하면 돌려드려요. 현재 토큰 {tokenBalance}개
            </p>
            {error ? <p className="mt-2 text-center text-sm text-red-500">{error}</p> : null}
          </aside>
        </div>
      )}

      <TokenConfirmDialog
        open={confirmOpen}
        tokens={tokenBalance}
        pending={starting}
        pendingLabel="시작하는 중..."
        pendingMessage="표정 그리기를 시작하고 있어요."
        description="미리보기를 만들면 토큰 1개가 사용돼요. 결제하면 다시 돌려드려요."
        onClose={() => {
          if (!starting) {
            setConfirmOpen(false);
          }
        }}
        onConfirm={() => void start()}
      />
    </div>
  );
}

export type WordbookOrderView = {
  id: string;
  characterLabel: string;
  status: "GENERATING" | "READY" | "FAILED" | string;
  paid: boolean;
  baseImage: string;
  curiousImage: string | null;
  surprisedImage: string | null;
  curiousRegenLeft: number;
  surprisedRegenLeft: number;
};

const EXPRESSION_BADGE: Record<WordbookExpression, { mark: string; className: string }> = {
  curious: { mark: "?", className: "bg-[#F6E7C1] text-[#8A5A12]" },
  surprised: { mark: "!", className: "bg-[#FDE8E0] text-[#C45C42]" },
};

function GeneratingOverlay() {
  const [percent, setPercent] = useState(12);
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      setPercent(estimatedGenerationPercent((Date.now() - started) / 1000, "sticker"));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/75">
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-[#FDE8E0] border-t-[#E07A5F]" aria-hidden="true" />
      <span className="text-sm font-semibold text-[#C45C42]">그리는 중 {percent}%</span>
    </span>
  );
}

export function WordbookResultPanel({
  order,
  tokenBalance,
}: {
  order: WordbookOrderView;
  tokenBalance: number;
}) {
  const router = useRouter();
  const [tokens, setTokens] = useState(tokenBalance);
  const [busy, setBusy] = useState<null | "pay" | "retry" | WordbookExpression>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generating = order.status === "GENERATING";
  const failed = order.status === "FAILED";
  const ready = order.status === "READY";
  const step = order.paid ? 4 : ready ? 3 : 2;

  useEffect(() => setTokens(tokenBalance), [tokenBalance]);

  async function post(url: string, body?: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      tokens?: number;
      paid?: boolean;
    } | null;
    if (!response.ok) {
      throw new Error(payload?.error ?? "요청을 처리하지 못했습니다.");
    }
    return payload;
  }

  async function regenerate(expression: WordbookExpression) {
    if (busy) {
      return;
    }
    setBusy(expression);
    setError(null);
    try {
      await post(`/api/wordbooks/${order.id}/regenerate`, { expression });
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "표정을 다시 그리지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function retry() {
    if (busy) {
      return;
    }
    setBusy("retry");
    setError(null);
    try {
      await post(`/api/wordbooks/${order.id}/regenerate`, { retry: true });
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "다시 시도하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function pay() {
    if (busy) {
      return;
    }
    setBusy("pay");
    setError(null);
    try {
      const payload = await post(`/api/wordbooks/${order.id}/pay`);
      if (typeof payload?.tokens === "number") {
        setTokens(payload.tokens);
      }
      setPayOpen(false);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "토큰을 사용하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  const cards: {
    key: "base" | WordbookExpression;
    image: string | null;
    loading: boolean;
    regenLeft?: number;
  }[] = [
    { key: "base", image: order.baseImage, loading: false },
    {
      key: "curious",
      image: order.curiousImage,
      loading: (generating && !order.curiousImage) || busy === "curious",
      regenLeft: order.curiousRegenLeft,
    },
    {
      key: "surprised",
      image: order.surprisedImage,
      loading: (generating && !order.surprisedImage) || busy === "surprised",
      regenLeft: order.surprisedRegenLeft,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <WordbookSteps current={step} />

      <section className="mt-4 rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-sky-100 sm:p-6">
        <h2 className="text-lg font-semibold text-stone-800">
          {order.paid
            ? `${order.characterLabel}의 단어 그림책이 완성됐어요`
            : generating
              ? "표정 2가지를 그리고 있어요"
              : failed
                ? "표정을 그리지 못했어요"
                : "표정 3가지가 준비됐어요"}
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          {order.paid
            ? "태블릿에서 열어 홈 화면에 추가한 뒤 한 번 내려받으면 인터넷 없이도 볼 수 있어요."
            : generating
              ? "보통 1~2분 걸려요. 이 창을 닫아도 완성되면 최근 작업에서 볼 수 있어요."
              : failed
                ? "미리보기에 쓴 토큰은 돌려드렸어요. 다시 시도해 주세요."
                : `마음에 들지 않는 표정은 ${WORDBOOK_FREE_REGEN}번까지 다시 그릴 수 있어요.`}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {cards.map((card) => {
            const info = WORDBOOK_EXPRESSION_INFO[card.key];
            const badge = card.key === "base" ? null : EXPRESSION_BADGE[card.key];
            return (
              <article key={card.key} className="overflow-hidden rounded-[22px] bg-sky-50/60 ring-1 ring-sky-100">
                <div className="relative m-3 mb-0 aspect-square overflow-hidden rounded-2xl bg-white">
                  {card.image ? (
                    <img
                      src={toProtectedMediaSrc(card.image)}
                      alt={info.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={toProtectedMediaSrc(order.baseImage)}
                      alt=""
                      className="h-full w-full object-cover opacity-30"
                    />
                  )}
                  {badge && card.image && !card.loading ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold shadow",
                        badge.className,
                      )}
                    >
                      {badge.mark}
                    </span>
                  ) : null}
                  {!order.paid && card.image && card.key !== "base" ? (
                    <PreviewWatermark size="sm" />
                  ) : null}
                  {card.loading ? <GeneratingOverlay /> : null}
                </div>
                <div className="flex items-start justify-between gap-2 px-4 pb-4 pt-3">
                  <div>
                    <h3 className="text-base font-semibold text-stone-800">{info.label}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{info.usage}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
                      card.key === "base"
                        ? "bg-sky-100 text-sky-700"
                        : card.loading
                          ? "bg-[#FDE8E0] text-[#C45C42]"
                          : card.image
                            ? "bg-sky-100 text-sky-700"
                            : "bg-red-50 text-red-600",
                    )}
                  >
                    {card.key === "base" ? "불러옴" : card.loading ? "그리는 중" : card.image ? "완성" : "실패"}
                  </span>
                </div>
                {ready && !order.paid && card.key !== "base" ? (
                  <div className="px-4 pb-4">
                    <button
                      type="button"
                      onClick={() => void regenerate(card.key as WordbookExpression)}
                      disabled={Boolean(busy) || (card.regenLeft ?? 0) < 1}
                      className="flex h-10 w-full items-center justify-center whitespace-nowrap rounded-full border border-sky-200 bg-white px-3.5 text-sm font-medium text-stone-700 hover:bg-sky-50 disabled:opacity-50"
                    >
                      다시 그리기 ({card.regenLeft ?? 0}번 남음)
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {failed ? (
            <button
              type="button"
              onClick={() => void retry()}
              disabled={Boolean(busy)}
              className="inline-flex h-12 w-full items-center justify-center whitespace-nowrap rounded-full bg-[#E07A5F] px-6 text-sm font-semibold text-white hover:bg-[#d56c51] disabled:opacity-50 sm:w-auto"
            >
              {busy === "retry" ? "다시 시작하는 중..." : "다시 그리기 (토큰 1개)"}
            </button>
          ) : order.paid ? (
            <div className="flex flex-wrap items-center gap-2">
              <WordbookInstallGuideButton />
              <Link
                href={`/wordbook/${order.id}`}
                className="inline-flex h-12 items-center rounded-full bg-[#E07A5F] px-6 text-sm font-semibold text-white hover:bg-[#d56c51]"
              >
                태블릿에서 열기
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              disabled={!ready || Boolean(busy)}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#E07A5F] px-6 text-sm font-semibold text-white hover:bg-[#d56c51] disabled:opacity-50 sm:w-auto"
            >
              {formatTokens(WORDBOOK_PRICE_TOKENS)} 사용하고 그림책 만들기
            </button>
          )}
        </div>
        {error ? <p className="mt-3 text-center text-sm text-red-500">{error}</p> : null}
      </section>

      <TokenConfirmDialog
        open={payOpen}
        tokens={tokens}
        pending={busy === "pay"}
        pendingLabel="사용 중..."
        pendingMessage="토큰을 사용하고 있어요. 잠시만 기다려 주세요."
        description={`${formatTokens(WORDBOOK_PRICE_TOKENS)}이 사용돼요. 미리보기에 쓴 토큰 1개는 결제하면 다시 돌아와요.`}
        confirmLabel={tokens < WORDBOOK_PRICE_TOKENS ? "토큰이 부족합니다" : "수락"}
        confirmDisabled={tokens < WORDBOOK_PRICE_TOKENS}
        onClose={() => {
          if (busy !== "pay") {
            setPayOpen(false);
          }
        }}
        onConfirm={() => void pay()}
      />
    </div>
  );
}
