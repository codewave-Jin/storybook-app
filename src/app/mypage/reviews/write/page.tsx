import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { ReviewForm } from "@/components/mypage/ReviewForm";
import { prisma } from "@/lib/prisma";

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
      : `${(lockedOrder as { character: { label: string } }).character.label} · ${(lockedOrder as { template: { label: string } }).template.label}`;

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
