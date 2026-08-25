import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { OrderWizard } from "@/components/OrderWizard";
import { prisma } from "@/lib/prisma";
import { parseCustomFields } from "@/lib/templates";

export default async function NewOrderPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/order/new");
  }

  const [templates, characters] = await Promise.all([
    prisma.storybookTemplate.findMany({
      orderBy: { title: "asc" },
    }),
    prisma.character.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <DashboardShell title="동화책 주문">
      <OrderWizard
        templates={templates.map((template) => ({
          id: template.id,
          title: template.title,
          description: template.description,
          customFields: parseCustomFields(template.customFields),
        }))}
        characters={characters.map((character) => ({
          id: character.id,
          label: character.label,
          gender: character.gender,
          status: character.status,
          generatedImagePath: character.generatedImagePath,
          originalPhotoPath: character.originalPhotoPath,
        }))}
      />
    </DashboardShell>
  );
}
