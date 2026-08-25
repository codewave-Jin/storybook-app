import { revalidatePath } from "next/cache";

export function revalidateIllustrationWork(orderId: string) {
  revalidatePath(`/admin/illustrations/${orderId}`);
}

export function revalidateAdminOrderViews(orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/illustrations");
  revalidatePath(`/admin/illustrations/${orderId}`);
  revalidatePath("/admin/upscale");
  revalidatePath(`/admin/upscale/${orderId}`);
}
