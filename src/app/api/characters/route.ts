import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postToComfy } from "@/lib/comfy-server";
import { prisma } from "@/lib/prisma";
import { canCreateCharacter, consumeToken } from "@/lib/tokens";
import {
  deletePublicFile,
  saveCharacterPhoto,
  toAbsolutePublicPath,
} from "@/lib/uploads";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const userId = session.user.id;
  const formData = await request.formData();
  const label = String(formData.get("label") ?? "").trim();
  const gender = String(formData.get("gender") ?? "");
  const photo = formData.get("photo");

  if (!label) {
    return NextResponse.json(
      { error: "캐릭터 라벨을 입력해 주세요." },
      { status: 400 },
    );
  }

  if (gender !== "MALE" && gender !== "FEMALE") {
    return NextResponse.json(
      { error: "성별을 선택해 주세요." },
      { status: 400 },
    );
  }

  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json(
      { error: "사진을 업로드해 주세요." },
      { status: 400 },
    );
  }

  const slot = await canCreateCharacter(userId);
  if (!slot.canCreate) {
    return NextResponse.json(
      { error: "슬롯이 가득 찼습니다. 캐릭터를 삭제해주세요" },
      { status: 400 },
    );
  }

  const inflight = await prisma.character.count({
    where: {
      userId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });
  if (inflight > 0) {
    return NextResponse.json(
      {
        error:
          "이미 캐릭터를 생성 중입니다. 완료된 뒤에 다시 시도해 주세요.",
      },
      { status: 409 },
    );
  }

  let originalPhotoPath: string;
  try {
    originalPhotoPath = await saveCharacterPhoto(photo);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "사진 업로드에 실패했습니다.",
      },
      { status: 400 },
    );
  }

  const consumed = await consumeToken(userId);
  if (!consumed.success) {
    await deletePublicFile(originalPhotoPath);
    return NextResponse.json(
      { error: consumed.message ?? "토큰이 부족합니다" },
      { status: 400 },
    );
  }

  let characterId: string;
  try {
    const character = await prisma.character.create({
      data: {
        userId,
        label,
        gender,
        originalPhotoPath,
        status: "PENDING",
      },
    });
    characterId = character.id;
  } catch {
    await prisma.tokenBalance.update({
      where: { userId },
      data: { balance: { increment: 1 } },
    });
    await deletePublicFile(originalPhotoPath);
    return NextResponse.json(
      { error: "캐릭터 생성에 실패했습니다. 다시 시도해 주세요." },
      { status: 500 },
    );
  }

  await prisma.character.update({
    where: { id: characterId },
    data: { status: "PROCESSING" },
  });

  const imagePath = toAbsolutePublicPath(originalPhotoPath);

  try {
    const response = await postToComfy("/generate-character", {
      character_id: characterId,
      image_path: imagePath,
      gender: gender.toLowerCase(),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("generate-character rejected", response.status, detail);
      throw new Error(`Comfy rejected generate-character (${response.status})`);
    }
  } catch (error) {
    console.error("generate-character request failed", error);
    await prisma.character.update({
      where: { id: characterId },
      data: { status: "FAILED" },
    });
    await prisma.tokenBalance.update({
      where: { userId },
      data: { balance: { increment: 1 } },
    });
    revalidatePath("/dashboard");
    return NextResponse.json(
      {
        error:
          "생성 서버에 연결하지 못했습니다. ngrok과 FastAPI가 켜져 있는지 확인해 주세요.",
      },
      { status: 502 },
    );
  }

  revalidatePath("/dashboard");

  return NextResponse.json({ character_id: characterId });
}
