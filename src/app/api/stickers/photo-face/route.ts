import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { persistGeneratedStickerBuffer } from "@/lib/uploads";

export const maxDuration = 60;

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "얼굴 이미지가 없습니다." }, { status: 400 });
  }
  if (file.type !== "image/png") {
    return NextResponse.json({ error: "PNG 이미지만 저장할 수 있습니다." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "이미지가 너무 큽니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (
    buffer.length < 8 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47
  ) {
    return NextResponse.json({ error: "PNG 이미지가 아닙니다." }, { status: 400 });
  }

  const imagePath = await persistGeneratedStickerBuffer(
    buffer,
    "image/png",
    session.user.id,
  );
  return NextResponse.json({ imagePath });
}
