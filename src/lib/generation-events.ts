import { prisma } from "@/lib/prisma";

export type GenerationEventKind =
  | "CHARACTER"
  | "ILLUSTRATION"
  | "STICKER"
  | "STORYBOOK_ORDER";

export type LogGenerationEventInput = {
  kind: GenerationEventKind;
  entityId: string;
  orderId?: string;
  userId?: string;
  step: string;
  message?: string;
  detail?: Record<string, unknown>;
};

function compactDetail(detail?: Record<string, unknown>) {
  if (!detail) {
    return undefined;
  }
  const entries = Object.entries(detail).filter(
    ([, value]) => value !== undefined && value !== null,
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * Structured generation timeline: Vercel runtime logs + Supabase generation_events.
 * Fire-and-forget DB write; never blocks or throws on the hot path.
 */
export function logGenerationEvent(input: LogGenerationEventInput) {
  const detail = compactDetail(input.detail);
  const line = {
    kind: input.kind,
    entityId: input.entityId,
    orderId: input.orderId,
    userId: input.userId,
    step: input.step,
    message: input.message,
    detail,
    ts: new Date().toISOString(),
  };

  console.log(`[generation] ${JSON.stringify(line)}`);

  void prisma.generationEvent
    .create({
      data: {
        kind: input.kind,
        entityId: input.entityId,
        orderId: input.orderId,
        userId: input.userId,
        step: input.step,
        message: input.message,
        detail: detail ?? undefined,
      },
    })
    .catch((error) => {
      console.warn("[generation] failed to persist event", input.step, error);
    });
}

export async function loadGenerationEvents(options: {
  orderId?: string;
  entityId?: string;
  kind?: string;
  limit?: number;
}) {
  const limit = options.limit ?? 80;
  return prisma.generationEvent.findMany({
    where: {
      ...(options.orderId ? { orderId: options.orderId } : {}),
      ...(options.entityId ? { entityId: options.entityId } : {}),
      ...(options.kind ? { kind: options.kind } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
