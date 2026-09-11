import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { contentDisposition } from "@/lib/files";
import { parseRegenUploads } from "@/lib/character-regen-input";
import { parseIdList } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { readStoredAsset } from "@/lib/uploads";

export async function GET(
  request: Request,
  { params }: { params: { orderId: string; characterId: string } },
) {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const variant = new URL(request.url).searchParams.get("variant") ?? "regen";
  const order = await prisma.storybookOrder.findUnique({
    where: { id: params.orderId },
    select: {
      artStyleId: true,
      selectedCharacterIds: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const characterIds = parseIdList(order.selectedCharacterIds);
  if (!characterIds.includes(params.characterId)) {
    return NextResponse.json({ error: "캐릭터를 찾을 수 없습니다." }, { status: 404 });
  }

  const character = await prisma.character.findUnique({
    where: { id: params.characterId },
    select: {
      label: true,
      generatedImagePath: true,
      originalPhotoPath: true,
    },
  });
  if (!character) {
    return NextResponse.json({ error: "캐릭터를 찾을 수 없습니다." }, { status: 404 });
  }

  const asset = order.artStyleId
    ? await prisma.characterAsset.findFirst({
        where: {
          characterId: params.characterId,
          artStyleId: order.artStyleId,
        },
        orderBy: { createdAt: "desc" },
        select: {
          rawPortraitUrl: true,
          styledImageUrl: true,
          regenInputUrl: true,
          regenUploads: true,
        },
      })
    : null;

  const original =
    character.generatedImagePath?.trim() ||
    asset?.rawPortraitUrl?.trim() ||
    character.originalPhotoPath;
  const styled = asset?.styledImageUrl?.trim() || null;
  const regenOverride = asset?.regenInputUrl?.trim() || null;
  const uploads = parseRegenUploads(asset?.regenUploads);
  const requestedUrl = new URL(request.url).searchParams.get("url")?.trim() || "";
  const allowed = new Set(
    [original, styled, regenOverride, ...uploads].filter(
      (item): item is string => Boolean(item),
    ),
  );
  const path =
    requestedUrl && allowed.has(requestedUrl)
      ? requestedUrl
      : variant === "original"
        ? original
        : variant === "styled"
          ? styled
          : regenOverride || styled || original;

  if (!path) {
    return NextResponse.json({ error: "이미지가 없습니다." }, { status: 404 });
  }

  const file = await readStoredAsset(path);
  if (!file) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const suffix =
    variant === "original" ? "입력" : variant === "styled" ? "그림체" : "재생성입력";
  const filename = `${character.label}_${suffix}.png`;

  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": contentDisposition(filename),
    },
  });
}
