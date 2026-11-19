import type { Metadata, Viewport } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { WordbookPlayer } from "@/components/wordbook/WordbookPlayer";
import { toProtectedMediaSrc } from "@/lib/media-paths";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 홈 화면에 추가하면 이 책이 바로 열리도록 책마다 manifest 를 붙인다 */
export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return {
    title: "단어 그림책 | 판바기",
    manifest: `/wordbook/${params.id}/manifest`,
    appleWebApp: {
      capable: true,
      title: "단어 그림책",
      statusBarStyle: "default",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

/**
 * 단어 그림책 플레이어 (시작 → 홈 → 소개 → 게임).
 * - 결제 전(READY)에는 미리보기로 열린다.
 * - 개발 환경에서는 /wordbook/demo 로 내 최신 캐릭터를 넣어 화면만 확인할 수 있다.
 */
export default async function WordbookPlayerPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/wordbook/${params.id}`);
  }
  const userId = session.user.id;

  if (params.id === "demo") {
    if (process.env.NODE_ENV === "production") {
      notFound();
    }
    const character = await prisma.character.findFirst({
      where: { userId, deletedAt: null, status: "COMPLETED", generatedImagePath: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { generatedImagePath: true, label: true },
    });
    if (!character?.generatedImagePath) {
      redirect("/dashboard/characters/new");
    }
    const base = toProtectedMediaSrc(character.generatedImagePath);
    return (
      <WordbookPlayer
        character={{ name: character.label || "우리 아이", base, curious: null, surprised: null }}
        exitHref="/dashboard"
        preview
        offline
        bookKey="demo"
      />
    );
  }

  const order = await prisma.wordbookOrder.findFirst({
    where: { id: params.id, userId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      baseImagePath: true,
      curiousImagePath: true,
      surprisedImagePath: true,
      character: { select: { label: true } },
    },
  });
  if (!order) {
    notFound();
  }
  if (order.status !== "READY") {
    redirect(`/dashboard/wordbook/${order.id}`);
  }

  return (
    <WordbookPlayer
      character={{
        name: order.character?.label || "우리 아이",
        base: toProtectedMediaSrc(order.baseImagePath),
        curious: order.curiousImagePath ? toProtectedMediaSrc(order.curiousImagePath) : null,
        surprised: order.surprisedImagePath ? toProtectedMediaSrc(order.surprisedImagePath) : null,
      }}
      exitHref={`/dashboard/wordbook/${order.id}`}
      preview={order.paymentStatus !== "PAID"}
      offline={order.paymentStatus === "PAID"}
      bookKey={order.id}
    />
  );
}
