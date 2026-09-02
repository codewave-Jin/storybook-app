export function characterStatusPayload(
  items: Array<{ id: string; status: string }>,
) {
  return {
    characters: [...items]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ id, status }) => ({ id, status })),
  };
}

export function illustrationStatusPayload(
  items: Array<{
    id: string;
    status: string;
    imagePath?: string | null;
    pageNumber?: number;
    queueStatus?: "QUEUED" | "RUNNING" | null;
    queueAhead?: number;
    progressLabel?: string | null;
  }>,
) {
  return {
    illustrations: [...items]
      .sort((a, b) => {
        const pageDelta = (a.pageNumber ?? 0) - (b.pageNumber ?? 0);
        if (pageDelta !== 0) {
          return pageDelta;
        }
        return a.id.localeCompare(b.id);
      })
      .map(
        ({
          id,
          status,
          imagePath,
          pageNumber,
          queueStatus,
          queueAhead,
          progressLabel,
        }) => ({
          id,
          status,
          pageNumber: pageNumber ?? null,
          imagePath: imagePath ?? null,
          imageUrl: imagePath ?? null,
          queueStatus: queueStatus ?? null,
          queueAhead: queueAhead ?? 0,
          progressLabel: progressLabel ?? null,
        }),
      ),
  };
}
