import { waitUntil } from "@vercel/functions";
import { getAppBaseUrl } from "@/lib/app-url";

export function enqueueIllustrationGenerations(illustrationIds: string[]) {
  if (illustrationIds.length === 0) {
    return Promise.resolve();
  }

  const baseUrl = getAppBaseUrl();
  const headers: Record<string, string> = {};
  const apiKey = process.env.INTERNAL_API_KEY;
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const dispatched = Promise.all(
    illustrationIds.map((illustrationId) =>
      fetch(`${baseUrl}/api/illustrations/${illustrationId}/generate`, {
        method: "POST",
        headers,
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.text().catch(() => "");
            console.error(
              "[storybook-generation] generate enqueue failed",
              illustrationId,
              response.status,
              body,
            );
          }
        })
        .catch((error) => {
          console.error(
            "[storybook-generation] generate enqueue failed",
            illustrationId,
            error,
          );
        }),
    ),
  );

  waitUntil(dispatched);
  return dispatched;
}
