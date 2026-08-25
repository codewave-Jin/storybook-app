import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id || !session.user.isAdmin) {
    redirect("/login");
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    isAdmin: true as const,
  };
}

export async function getAdminOrNull() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) {
    return null;
  }

  return {
    id: session.user.id,
    isAdmin: true as const,
  };
}
