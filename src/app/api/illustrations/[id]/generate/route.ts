import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { unauthorizedIfInvalidInternalKey } from "@/lib/internal-auth";
import { runIllustrationGeneration } from "@/lib/illustration-generate";
import { shouldGenerateIllustration } from "@/lib/illustration-generation-policy";
import { parseIdList } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

/** Pro 300초. Hobby는 60초로 캡된다. Next가 리터럴을 정적으로 읽는다. */
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const unauthorized = unauthorizedIfInvalidInternalKey(request);
  if (unauthorized) {
    return unauthorized;
  }

  const illustration = await prisma.illustration.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      prompt: true,
      selectedCharacterIds: true,
      status: true,
      updatedAt: true,
    },
  });

  if (!illustration) {
    return NextResponse.json({ error: "Illustration not found" }, { status: 404 });
  }

  if (illustration.status === "COMPLETED") {
    return NextResponse.json({ ok: true, skipped: true, reason: "completed" });
  }

  if (!shouldGenerateIllustration(illustration)) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: "already processing" },
      { status: 202 },
    );
  }

  if (!illustration.prompt.trim()) {
    return NextResponse.json({ error: "prompt is empty" }, { status: 400 });
  }

  const characterIds = parseIdList(illustration.selectedCharacterIds);
  if (characterIds.length < 1) {
    return NextResponse.json(
      { error: "characterIds are required" },
      { status: 400 },
    );
  }

  waitUntil(
    runIllustrationGeneration({
      illustrationId: illustration.id,
      prompt: illustration.prompt,
      characterIds,
    }).catch((error) => {
      console.error(
        "[illustration generate] background generate failed",
        illustration.id,
        error,
      );
    }),
  );

  return NextResponse.json(
    { ok: true, accepted: true, illustrationId: illustration.id },
    { status: 202 },
  );
}
