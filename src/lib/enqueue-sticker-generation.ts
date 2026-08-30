import { waitUntil } from "@vercel/functions";
import { getAppBaseUrl } from "@/lib/app-url";

export function enqueueStickerGeneration(orderId: string) {
  const baseUrl = getAppBaseUrl();
  const headers: Record<string, string> = {};
  const apiKey = process.env.INTERNAL_API_KEY;
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const dispatched = fetch(`${baseUrl}/api/stickers/${orderId}/generate`, {
    method: "POST",
    headers,
  })
    .then(async (response) => {
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error(
          "[sticker-generation] enqueue failed",
          orderId,
          response.status,
          body,
        );
      }
    })
    .catch((error) => {
      console.error("[sticker-generation] enqueue failed", orderId, error);
    });

  waitUntil(dispatched);
  return dispatched;
}
