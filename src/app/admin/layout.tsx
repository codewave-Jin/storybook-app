import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900 lg:flex-row">
      <AdminSidebar />
      <div className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:p-8">{children}</div>
    </div>
  );
}
