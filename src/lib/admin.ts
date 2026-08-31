import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function loadAdminUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, isAdmin: true },
  });
}

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const user = await loadAdminUser(session.user.id);
  if (!user?.isAdmin) {
    redirect("/dashboard");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: true as const,
  };
}

export async function getAdminOrNull() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await loadAdminUser(session.user.id);
  if (!user?.isAdmin) {
    return null;
  }

  return {
    id: user.id,
    isAdmin: true as const,
  };
}
