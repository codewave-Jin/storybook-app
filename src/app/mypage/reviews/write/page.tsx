import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { ReviewForm } from "@/components/mypage/ReviewForm";
import { prisma } from "@/lib/prisma";
import { stickerOrderExtraLabel, stickerOrderTitle } from "@/lib/templates";

export default async function WriteReviewPage({
  searchParams,
}: {
  searchParams: { kind?: string; orderId?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/mypage/reviews/write");
  }

  const userId = session.user.id;
  const kind = searchParams.kind;
  const orderId = searchParams.orderId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) {
    redirect(
      "/api/auth/force-logout?callbackUrl=/login%3FcallbackUrl%3D%2Fmypage%2Freviews",
    );
  }

  if (kind !== "storybook" && kind !== "sticker") {
    notFound();
  }
  if (!orderId) {
    notFound();
  }

  const lockedOrder =
    kind === "storybook"
      ? await prisma.storybookOrder.findFirst({
          where: {
            id: orderId,
            userId,
            paymentStatus: "PAID",
            productionStatus: "COMPLETED",
            review: null,
          },
          include: { template: { select: { title: true } } },
        })
      : await prisma.stickerOrder.findFirst({
          where: {
            id: orderId,
            userId,
            paymentStatus: "PAID",
            productionStatus: "COMPLETED",
            review: null,
          },
          include: {
            border: { select: { label: true } },
            template: { select: { label: true } },
            character: { select: { label: true } },
          },
        });

  if (!lockedOrder) {
    notFound();
  }

  const title =
    kind === "storybook"
      ? (lockedOrder as { template: { title: string } }).template.title
      : stickerOrderTitle(
          (lockedOrder as { character: { label: string } }).character.label,
          stickerOrderExtraLabel(
            lockedOrder as {
              border: { label: string } | null;
              template: { label: string } | null;
            },
          ),
        );

  return (
    <MyPageShell title="리뷰 쓰기" user={user}>
      <Link
        href="/mypage/reviews"
        className="mb-4 inline-flex text-sm font-medium text-[#E07A5F] hover:underline"
      >
        ← 내 리뷰
      </Link>
      <ReviewForm
        lockedOrder={{
          id: lockedOrder.id,
          kind,
          title,
        }}
      />
    </MyPageShell>
  );
}
