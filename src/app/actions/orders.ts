"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseCustomFields } from "@/lib/templates";

export type CreateOrderState = {
  error?: string;
} | undefined;

export async function createOrder(
  _prevState: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const templateId = String(formData.get("templateId") ?? "");
  const characterIds = formData
    .getAll("characterIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!templateId) {
    return { error: "동화책 유형을 선택해 주세요." };
  }

  if (characterIds.length < 1) {
    return { error: "캐릭터를 한 명 이상 선택해 주세요." };
  }

  if (characterIds.length > 3) {
    return { error: "캐릭터는 최대 3명까지 선택할 수 있습니다." };
  }

  const template = await prisma.storybookTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return { error: "선택한 동화책을 찾을 수 없습니다." };
  }

  const characters = await prisma.character.findMany({
    where: {
      id: { in: characterIds },
      userId,
    },
  });

  if (characters.length !== characterIds.length) {
    return { error: "선택한 캐릭터를 확인할 수 없습니다." };
  }

  if (characters.some((character) => character.status !== "COMPLETED")) {
    return { error: "생성이 완료된 캐릭터만 선택할 수 있습니다." };
  }

  const customFields = parseCustomFields(template.customFields);
  const customInputValues: Record<string, string> = {};

  for (const field of customFields) {
    const value = String(formData.get(`custom:${field.key}`) ?? "").trim();
    if (!value) {
      return { error: `${field.label}을(를) 입력해 주세요.` };
    }
    customInputValues[field.key] = value;
  }

  const order = await prisma.storybookOrder.create({
    data: {
      userId,
      templateId: template.id,
      selectedCharacterIds: characterIds,
      customInputValues,
      paymentStatus: "PAID",
      productionStatus: "WAITING",
    },
  });

  redirect(`/dashboard/orders/${order.id}`);
}
