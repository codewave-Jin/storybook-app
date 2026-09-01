import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { trySyncCharacterFromComfy } from "@/lib/character-generation";
import { characterStatusPayload } from "@/lib/generation-status";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const characters = await prisma.character.findMany({
    where: { userId: session.user.id },
    select: { id: true, status: true },
    orderBy: { id: "asc" },
  });

  const processingIds = characters
    .filter(
      (character) =>
        character.status === "PENDING" || character.status === "PROCESSING",
    )
    .map((character) => character.id);

  if (processingIds.length > 0) {
    await Promise.all(
      processingIds.map((characterId) => trySyncCharacterFromComfy(characterId)),
    );

    const refreshed = await prisma.character.findMany({
      where: { userId: session.user.id },
      select: { id: true, status: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json(characterStatusPayload(refreshed));
  }

  return NextResponse.json(characterStatusPayload(characters));
}
