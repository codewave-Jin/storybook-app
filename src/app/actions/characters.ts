"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isComfyMockEnabled } from "@/lib/comfy-server";
import { prisma } from "@/lib/prisma";
import {
  canCreateCharacter,
  consumeToken,
  refundToken,
} from "@/lib/tokens";
import { deletePublicFile, saveCharacterPhoto } from "@/lib/uploads";

export type CharacterFormState = {
  error?: string;
} | undefined;

export async function createCharacter(
  _prevState: CharacterFormState,
  formData: FormData,
): Promise<CharacterFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const label = String(formData.get("label") ?? "").trim();
  const gender = String(formData.get("gender") ?? "");
  const photo = formData.get("photo");

  if (!label) {
    return { error: "캐릭터 이름을 입력해 주세요." };
  }

  if (gender !== "MALE" && gender !== "FEMALE") {
    return { error: "성별을 선택해 주세요." };
  }

  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "사진을 업로드해 주세요." };
  }

  const slot = await canCreateCharacter(userId);
  if (!slot.canCreate) {
    return { error: "슬롯이 가득 찼습니다. 캐릭터를 삭제해주세요" };
  }

  let originalPhotoPath: string;
  try {
    originalPhotoPath = await saveCharacterPhoto(photo);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "사진 업로드에 실패했습니다.",
    };
  }

  const consumed = await consumeToken(userId);
  if (!consumed.success) {
    await deletePublicFile(originalPhotoPath);
    return { error: consumed.message ?? "토큰이 부족합니다" };
  }

  try {
    await prisma.character.create({
      data: {
        userId,
        label,
        gender,
        originalPhotoPath,
        ...(isComfyMockEnabled()
          ? {
              generatedImagePath: originalPhotoPath,
              status: "COMPLETED" as const,
              progressPercent: 100,
              progressLabel: "로컬 목업",
            }
          : { status: "PENDING" as const }),
      },
    });
  } catch {
    if (consumed.used) {
      await refundToken(userId, consumed.used);
    }
    await deletePublicFile(originalPhotoPath);
    return { error: "캐릭터 생성에 실패했습니다. 다시 시도해 주세요." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteCharacter(characterId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const character = await prisma.character.findFirst({
    where: {
      id: characterId,
      userId: session.user.id,
    },
  });

  if (!character) {
    return;
  }

  await prisma.character.delete({
    where: { id: character.id },
  });

  await deletePublicFile(character.originalPhotoPath);
  await deletePublicFile(character.generatedImagePath);

  revalidatePath("/dashboard");
}
