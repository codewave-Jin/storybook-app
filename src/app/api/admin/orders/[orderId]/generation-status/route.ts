import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { illustrationStatusPayload } from "@/lib/generation-status";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { orderId: string } },
) {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const illustrations = await prisma.illustration.findMany({
    where: { orderId: params.orderId },
    select: { id: true, status: true },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(illustrationStatusPayload(illustrations));
}
