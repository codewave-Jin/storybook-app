import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { loadActiveGenerationJobs } from "@/lib/generation-active-jobs";
import { loadGenerationEvents } from "@/lib/generation-events";

export async function GET(request: Request) {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId")?.trim() || undefined;
  const entityId = searchParams.get("entityId")?.trim() || undefined;
  const kind = searchParams.get("kind")?.trim() || undefined;
  const limit = Math.min(
    200,
    Math.max(20, Number(searchParams.get("limit") ?? 80) || 80),
  );

  let events: Awaited<ReturnType<typeof loadGenerationEvents>> = [];
  let eventsTableReady = true;

  try {
    events = await loadGenerationEvents({
      orderId,
      entityId,
      kind,
      limit,
    });
  } catch (error) {
    eventsTableReady = false;
    console.warn("[generation-events] query failed", error);
  }

  const activeJobs = await loadActiveGenerationJobs();

  return NextResponse.json({
    polledAt: new Date().toISOString(),
    eventsTableReady,
    activeJobs,
    events: events.map((event: Awaited<ReturnType<typeof loadGenerationEvents>>[number]) => ({
      id: event.id,
      kind: event.kind,
      entityId: event.entityId,
      orderId: event.orderId,
      step: event.step,
      message: event.message,
      detail: event.detail,
      createdAt: event.createdAt.toISOString(),
    })),
  });
}
