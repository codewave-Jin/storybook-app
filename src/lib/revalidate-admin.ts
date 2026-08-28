import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // CLI / non-Next context (tsx scripts) has no app router cache.
  }
}

export function revalidateIllustrationWork(orderId: string) {
  safeRevalidate(`/admin/illustrations/${orderId}`);
}

export function revalidateAdminOrderViews(orderId: string) {
  safeRevalidate("/admin");
  safeRevalidate("/admin/orders");
  safeRevalidate(`/admin/orders/${orderId}`);
  safeRevalidate("/admin/illustrations");
  safeRevalidate(`/admin/illustrations/${orderId}`);
  safeRevalidate("/admin/upscale");
  safeRevalidate(`/admin/upscale/${orderId}`);
}
