import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-stone-50 text-stone-900">
      <AdminSidebar />
      <div className="min-w-0 flex-1 p-8">{children}</div>
    </div>
  );
}
