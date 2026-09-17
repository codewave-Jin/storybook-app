import {
  illustrationMediaSrc,
  type MediaVariant,
} from "@/lib/media-paths";

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
  variant: MediaVariant = "preview",
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
        }) => {
          const mediaPath = imagePath ? illustrationMediaSrc(id, variant) : null;
          return {
            id,
            status,
            pageNumber: pageNumber ?? null,
            imagePath: mediaPath,
            imageUrl: mediaPath,
            queueStatus: queueStatus ?? null,
            queueAhead: queueAhead ?? 0,
            progressLabel: progressLabel ?? null,
          };
        },
      ),
  };
}
