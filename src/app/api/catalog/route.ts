import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/catalog — 公开产品目录（无需登录）
export async function GET() {
  const groups = await prisma.productGroup.findMany({
    where: { isPublic: true, deletedAt: null },
    include: {
      specs: {
        orderBy: { id: "asc" },
        select: {
          sku: true,
          spec: true,
          salePrice: true,
          carModel: true,
          oeCode: true,
        },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { filePath: true },
      },
    },
    orderBy: { id: "desc" },
  });

  return NextResponse.json({
    data: groups.map(g => ({
      id: g.id,
      sku: g.sku,
      name: g.name,
      images: g.images,
      specs: g.specs,
    })),
  });
}
