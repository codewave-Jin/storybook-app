import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { getAdminOrNull } from "@/lib/admin";
import { contentDisposition, fileExists, publicUrlToFsPath } from "@/lib/files";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { illustrationId: string } },
) {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const illustration = await prisma.illustration.findUnique({
    where: { id: params.illustrationId },
    select: {
      imagePath: true,
      pageNumber: true,
      orderId: true,
    },
  });

  if (!illustration?.imagePath) {
    return NextResponse.json({ error: "이미지가 없습니다." }, { status: 404 });
  }

  const filepath = publicUrlToFsPath(illustration.imagePath);
  if (!filepath || !(await fileExists(filepath))) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const filename = `${illustration.orderId}_${illustration.pageNumber}_원본.png`;
  const file = await readFile(filepath);

  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": contentDisposition(filename),
    },
  });
}
