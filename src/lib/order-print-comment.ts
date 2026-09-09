import { prisma } from "@/lib/prisma";

export async function loadOrderPrintComment(orderId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ printComment: string | null }>>`
      SELECT "printComment" FROM "StorybookOrder" WHERE id = ${orderId}
    `;
    const comment = rows[0]?.printComment?.trim();
    return comment || null;
  } catch (error) {
    console.error("loadOrderPrintComment failed", error);
    return null;
  }
}

export async function saveOrderPrintComment(orderId: string, comment: string) {
  await prisma.$executeRaw`
    UPDATE "StorybookOrder"
    SET "printComment" = ${comment || null}
    WHERE id = ${orderId}
  `;
}
