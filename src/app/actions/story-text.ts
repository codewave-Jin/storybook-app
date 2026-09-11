"use server";

import { auth } from "@/auth";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const MAX_STORY_TEXT = 2000;

function cleanStoryText(raw: string) {
  return raw.replace(/\r\n/g, "\n").trim().slice(0, MAX_STORY_TEXT);
}

export async function saveOrderStoryText(input: {
  illustrationId: string;
  storyText: string;
}): Promise<{ error?: string; storyText?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "로그인이 필요합니다." };
  }

  const illustration = await prisma.illustration.findUnique({
    where: { id: input.illustrationId },
    select: {
      id: true,
      pageType: true,
      order: { select: { id: true, userId: true } },
    },
  });

  if (!illustration || illustration.order.userId !== session.user.id) {
    return { error: "페이지를 찾을 수 없습니다." };
  }

  if (illustration.pageType === "COVER") {
    return { error: "표지에는 본문 글이 없습니다." };
  }

  const storyText = cleanStoryText(input.storyText);
  await prisma.illustration.update({
    where: { id: illustration.id },
    data: { storyText },
  });
  revalidatePath(`/dashboard/orders/${illustration.order.id}/preview`);
  revalidatePath(`/admin/illustrations/${illustration.order.id}`);
  return { storyText };
}

export async function saveAdminStoryText(input: {
  illustrationId: string;
  storyText: string;
}): Promise<{ error?: string; storyText?: string }> {
  await requireAdmin();

  const illustration = await prisma.illustration.findUnique({
    where: { id: input.illustrationId },
    select: { id: true, pageType: true, orderId: true },
  });
  if (!illustration) {
    return { error: "페이지를 찾을 수 없습니다." };
  }
  if (illustration.pageType === "COVER") {
    return { error: "표지에는 본문 글이 없습니다." };
  }

  const storyText = cleanStoryText(input.storyText);
  await prisma.illustration.update({
    where: { id: illustration.id },
    data: { storyText },
  });
  revalidatePath(`/admin/illustrations/${illustration.orderId}`);
  return { storyText };
}
