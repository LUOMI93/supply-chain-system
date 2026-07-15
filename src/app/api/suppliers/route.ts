import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

// GET /api/suppliers
export async function GET() {
  const { error, user } = await requireAuth();
  if (error) return error;

  // viewer 用户：根据可见供应商过滤；editor 默认可见全部供应商
  let supplierIdsFilter: number[] | undefined;
  if (user?.role === "viewer") {
    const visibleIds = await prisma.userSupplierVisibility.findMany({
      where: { userId: user.id },
      select: { supplierId: true },
    });
    supplierIdsFilter = visibleIds.map((v) => v.supplierId);
  }

  const where = supplierIdsFilter ? { id: { in: supplierIdsFilter } } : {};

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { groups: { where: { deletedAt: null } } } },
      groups: {
        where: { deletedAt: null },
        select: { sku: true },
        orderBy: { id: "asc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    data: suppliers.map((s) => ({
      id: s.id,
      name: user?.role === "viewer" ? getSupplierAlias(s.groups[0]?.sku, s.id) : s.name,
      contact: user?.role === "viewer" ? null : s.contact,
      remark: user?.role === "viewer" ? null : s.remark,
      productCount: s._count.groups,
      createdAt: s.createdAt,
    })),
  });
}

function getSupplierAlias(sku: string | undefined, supplierId: number): string {
  if (!sku) return `S${supplierId}`;
  const prefix = sku.trim().match(/^[A-Za-z]+/)?.[0];
  if (prefix) return prefix.toUpperCase();
  return sku.split("-")[0] || `S${supplierId}`;
}

// POST /api/suppliers — 新增供应商
export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth(["admin", "editor"]);
  if (error) return error;

  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "供应商名称为必填" }, { status: 400 });
    }

    const existing = await prisma.supplier.findUnique({
      where: { name: body.name.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: "供应商已存在" }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: body.name.trim(),
        contact: body.contact?.trim() || null,
        remark: body.remark?.trim() || null,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user!.id,
          action: "CREATE",
          entityType: "supplier",
          entityId: supplier.id,
        },
      });
    } catch {
      // audit log failure 不影响主操作
    }

    return NextResponse.json(supplier, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: `创建失败: ${msg}` }, { status: 500 });
  }
}

// DELETE /api/suppliers — 批量删除供应商
export async function DELETE(req: NextRequest) {
  const { error, user } = await requireAuth(["admin", "editor"]);
  if (error) return error;

  try {
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "请选择要删除的供应商" }, { status: 400 });
    }

    const numIds = ids
      .map((id: unknown) => parseInt(String(id)))
      .filter((n: number) => !isNaN(n));
    if (numIds.length === 0) {
      return NextResponse.json({ error: "无效的供应商 ID" }, { status: 400 });
    }

    // 手动级联删除：先删除所有关联产品组的图片、规格、产品组，再删除供应商
    const groups = await prisma.productGroup.findMany({
      where: { supplierId: { in: numIds } },
      select: { id: true },
    });
    const groupIds = groups.map((g) => g.id);

    if (groupIds.length > 0) {
      await prisma.productImage.deleteMany({
        where: { groupId: { in: groupIds } },
      });
      await prisma.productSpec.deleteMany({
        where: { groupId: { in: groupIds } },
      });
      await prisma.productGroup.deleteMany({
        where: { id: { in: groupIds } },
      });
    }

    // 批量删除供应商
    const deleted = await prisma.supplier.deleteMany({
      where: { id: { in: numIds } },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user!.id,
          action: "DELETE",
          entityType: "supplier",
          detail: `批量删除 ${deleted.count} 个供应商`,
        },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, count: deleted.count });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: `删除失败: ${msg}` }, { status: 500 });
  }
}
