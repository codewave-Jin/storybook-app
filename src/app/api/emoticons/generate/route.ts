import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateEmoticonSheet, emoticonReferenceError } from "@/lib/emoticon-generate";
import { parseEmoticonAgeInput } from "@/lib/emoticon-prompt";
import { loadImageAsset } from "@/lib/openai-illustration";
import { isOpenAIRateLimitError } from "@/lib/openai-rate-limit";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const characterIdRaw = form?.get("characterId");
  const characterId =
    typeof characterIdRaw === "string" ? characterIdRaw.trim() : "";
  const file = form?.get("referenceImage");

  let imageBytes: Buffer | null = null;
  let imageMime = "image/png";
  if (characterId) {
    const character = await prisma.character.findFirst({
      where: { id: characterId, userId: session.user.id, deletedAt: null },
      select: { generatedImagePath: true, status: true },
    });
    if (!character || character.status !== "COMPLETED" || !character.generatedImagePath) {
      return NextResponse.json(
        { error: "완성된 캐릭터를 골라 주세요." },
        { status: 400 },
      );
    }
    const stored = await loadImageAsset(character.generatedImagePath);
    imageBytes = stored.bytes;
    imageMime = stored.mime;
  } else if (file instanceof File && file.size > 0) {
    const fileError = emoticonReferenceError(file);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }
    imageBytes = Buffer.from(await file.arrayBuffer());
    imageMime = file.type;
  } else {
    return NextResponse.json(
      { error: "실제 사진을 올리거나 만든 캐릭터를 골라 주세요." },
      { status: 400 },
    );
  }

  const age = parseEmoticonAgeInput(form?.get("age"), form?.get("ageUnit"));
  if ("error" in age) {
    return NextResponse.json({ error: age.error }, { status: 400 });
  }

  try {
    const result = await generateEmoticonSheet({
      imageBytes,
      imageMime,
      age: age.age,
      ageUnit: age.ageUnit,
      userId: session.user.id,
      email: session.user.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isOpenAIRateLimitError(error)) {
      return NextResponse.json(
        { error: "요청이 몰려 있어요. 잠시 후 다시 시도해 주세요." },
        { status: 429 },
      );
    }
    const message = error instanceof Error ? error.message : "unknown";
    console.error("[emoticon] generate failed", message);
    if (message === "이미지 파일이 아닙니다.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === "OPENAI_API_KEY is not set") {
      return NextResponse.json(
        { error: "이미지 생성 설정이 준비되지 않았습니다." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "이모티콘을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
