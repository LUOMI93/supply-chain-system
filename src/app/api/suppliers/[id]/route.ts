import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

// PATCH /api/suppliers/:id — 编辑供应商
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(["admin", "editor"]);
  if (error) return error;

  try {
    const { id } = await params;
    const supplierId = parseInt(id);

    if (isNaN(supplierId)) {
      return NextResponse.json({ error: "无效的供应商 ID" }, { status: 400 });
    }

    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "供应商名称为必填" }, { status: 400 });
    }

    const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!existing) {
      return NextResponse.json({ error: "供应商不存在" }, { status: 404 });
    }

    // 检查名称冲突（排除自身）
    const duplicate = await prisma.supplier.findFirst({
      where: { name: body.name.trim(), id: { not: supplierId } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "供应商名称已存在" }, { status: 400 });
    }

    const supplier = await prisma.supplier.update({
      where: { id: supplierId },
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
          action: "UPDATE",
          entityType: "supplier",
          entityId: supplierId,
          detail: `更新供应商：${supplier.name}`,
        },
      });
    } catch {
      // ignore
    }

    return NextResponse.json(supplier);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: `更新失败: ${msg}` }, { status: 500 });
  }
}

// DELETE /api/suppliers/:id — 单个删除供应商
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(["admin", "editor"]);
  if (error) return error;

  try {
    const { id } = await params;
    const supplierId = parseInt(id);

    if (isNaN(supplierId)) {
      return NextResponse.json({ error: "无效的供应商 ID" }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { _count: { select: { groups: { where: { deletedAt: null } } } } },
    });

    if (!supplier) {
      return NextResponse.json({ error: "供应商不存在" }, { status: 404 });
    }

    // 手动级联删除：先删除所有关联产品组的图片、规格，再删除产品组，最后删除供应商
    const groups = await prisma.productGroup.findMany({
      where: { supplierId },
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

    await prisma.supplier.delete({
      where: { id: supplierId },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user!.id,
          action: "DELETE",
          entityType: "supplier",
          entityId: supplierId,
          detail: `删除供应商：${supplier.name}`,
        },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: `删除失败: ${msg}` }, { status: 500 });
  }
}
