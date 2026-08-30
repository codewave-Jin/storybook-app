import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { OrderWizard } from "@/components/OrderWizard";
import { prisma } from "@/lib/prisma";
import {
  isStorybookTemplateSelectable,
  parseCustomFields,
} from "@/lib/templates";

export default async function NewOrderPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/order/new");
  }

  const [templates, characters] = await Promise.all([
    prisma.storybookTemplate.findMany({
      orderBy: { title: "asc" },
      include: {
        artStyles: {
          where: {
            artStyle: {
              isActive: true,
              NOT: { referenceImageUrl: null },
            },
          },
          orderBy: { sortOrder: "asc" },
          include: {
            artStyle: {
              select: {
                id: true,
                key: true,
                label: true,
                referenceImageUrl: true,
              },
            },
          },
        },
      },
    }),
    prisma.character.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <DashboardShell title="동화책 주문">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-stone-500 underline-offset-4 hover:underline"
      >
        ← 대시보드로
      </Link>
      <div className="mt-4">
        <OrderWizard
          templates={templates
            .map((template) => ({
              id: template.id,
              title: template.title,
              description: template.description,
              available: isStorybookTemplateSelectable(template.title),
              customFields: parseCustomFields(template.customFields),
              artStyles: template.artStyles.flatMap((link) => {
                const url = link.artStyle.referenceImageUrl;
                if (!url) {
                  return [];
                }
                return [
                  {
                    id: link.artStyle.id,
                    key: link.artStyle.key,
                    label: link.artStyle.label,
                    referenceImageUrl: url,
                  },
                ];
              }),
            }))
            .sort((left, right) => Number(right.available) - Number(left.available))}
          characters={characters.map((character) => ({
            id: character.id,
            label: character.label,
            gender: character.gender,
            status: character.status,
            generatedImagePath: character.generatedImagePath,
            originalPhotoPath: character.originalPhotoPath,
          }))}
        />
      </div>
    </DashboardShell>
  );
}
