import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminOrNull } from "@/lib/admin";
import { unauthorizedIfInvalidInternalKey } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

type ProgressKind = "character" | "illustration" | "sticker";

function isProgressKind(value: string | null): value is ProgressKind {
  return value === "character" || value === "illustration" || value === "sticker";
}

async function authorizeRead(kind: ProgressKind, id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (kind === "character") {
    const character = await prisma.character.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!character || character.userId !== session.user.id) {
      const admin = await getAdminOrNull();
      if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    return null;
  }

  if (kind === "sticker") {
    const order = await prisma.stickerOrder.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!order || order.userId !== session.user.id) {
      const admin = await getAdminOrNull();
      if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    return null;
  }

  const illustration = await prisma.illustration.findUnique({
    where: { id },
    select: { order: { select: { userId: true } } },
  });
  if (!illustration || illustration.order.userId !== session.user.id) {
    const admin = await getAdminOrNull();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const id = searchParams.get("id");

  if (!isProgressKind(kind) || !id) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const unauthorized = await authorizeRead(kind, id);
  if (unauthorized) {
    return unauthorized;
  }

  if (kind === "character") {
    const character = await prisma.character.findUnique({
      where: { id },
      select: { progressPercent: true, progressLabel: true, status: true },
    });
    return NextResponse.json({
      percent:
        character?.status === "COMPLETED"
          ? 100
          : (character?.progressPercent ?? 0),
      label:
        character?.status === "COMPLETED"
          ? "완료"
          : (character?.progressLabel ?? "생성 중"),
      active:
        character?.status === "PENDING" || character?.status === "PROCESSING",
    });
  }

  if (kind === "sticker") {
    const order = await prisma.stickerOrder.findUnique({
      where: { id },
      select: { previewStatus: true },
    });
    const completed = order?.previewStatus === "COMPLETED";
    const failed = order?.previewStatus === "FAILED";
    return NextResponse.json({
      percent: completed ? 100 : 0,
      label: failed
        ? "실패"
        : completed
          ? "완료"
          : order?.previewStatus === "IDLE"
            ? "준비 중"
            : "스티커 생성 중",
      active:
        order?.previewStatus === "IDLE" ||
        order?.previewStatus === "PROCESSING",
    });
  }

  const illustration = await prisma.illustration.findUnique({
    where: { id },
    select: { progressPercent: true, progressLabel: true, status: true },
  });
  return NextResponse.json({
    percent:
      illustration?.status === "COMPLETED"
        ? 100
        : (illustration?.progressPercent ?? 0),
    label:
      illustration?.status === "COMPLETED"
        ? "완료"
        : (illustration?.progressLabel ?? "생성 중"),
    active: illustration?.status === "PROCESSING",
  });
}

export async function POST(request: Request) {
  const unauthorized = unauthorizedIfInvalidInternalKey(request);
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    id?: unknown;
    percent?: unknown;
    label?: unknown;
  } | null;

  const kind = body?.kind;
  const id = typeof body?.id === "string" ? body.id : "";
  const percent =
    typeof body?.percent === "number" && Number.isFinite(body.percent)
      ? Math.max(0, Math.min(99, Math.round(body.percent)))
      : null;
  const label =
    typeof body?.label === "string" && body.label.trim()
      ? body.label.trim()
      : "생성 중";

  if ((kind !== "character" && kind !== "illustration") || !id || percent === null) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (kind === "character") {
    const current = await prisma.character.findUnique({
      where: { id },
      select: { progressPercent: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.character.update({
      where: { id },
      data: {
        progressPercent: Math.max(current.progressPercent, percent),
        progressLabel: label,
      },
    });
    return NextResponse.json({ ok: true });
  }

  const current = await prisma.illustration.findUnique({
    where: { id },
    select: { progressPercent: true },
  });
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.illustration.update({
    where: { id },
    data: {
      progressPercent: Math.max(current.progressPercent, percent),
      progressLabel: label,
    },
  });
  return NextResponse.json({ ok: true });
}
