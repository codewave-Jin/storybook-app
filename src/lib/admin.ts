import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, email: true, name: true, id: true },
  });

  if (!user?.isAdmin) {
    redirect("/login");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: true,
  };
}

export async function getAdminOrNull() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, id: true },
  });

  if (!user?.isAdmin) {
    return null;
  }

  return user;
}
