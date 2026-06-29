import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/users/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
      visibleSuppliers: { select: { supplierId: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  return NextResponse.json({
    ...user,
    visibleSupplierIds: user.visibleSuppliers.map((v) => v.supplierId),
  });
}

// PATCH /api/users/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { error: authError } = await requireAuth(["admin"]);
  if (authError) return authError;

  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
  }

  const body = await req.json();
  const { displayName, role, password, visibleSupplierIds } = body;

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const { user: sessionUser } = await requireAuth(["admin"]);
  if (sessionUser?.id === userId && role && role !== existing.role) {
    return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (displayName !== undefined) updateData.displayName = displayName || null;
  if (role && ["admin", "editor", "viewer"].includes(role)) {
    updateData.role = role;
  }
  if (password) {
    if (password.length < 8) {
      return NextResponse.json({ error: "密码长度至少8位" }, { status: 400 });
    }
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  if (visibleSupplierIds !== undefined) {
    await prisma.userSupplierVisibility.deleteMany({ where: { userId } });
    if (Array.isArray(visibleSupplierIds) && visibleSupplierIds.length > 0) {
      await prisma.userSupplierVisibility.createMany({
        data: visibleSupplierIds.map((supplierId: number) => ({ userId, supplierId })),
      });
    }
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: updateData });
  }

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, username: true, displayName: true, role: true, createdAt: true,
      visibleSuppliers: { select: { supplierId: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "UPDATE_USER",
      entityType: "user",
      entityId: userId,
      detail: visibleSupplierIds !== undefined ? "更新了可见供应商范围" : undefined,
    },
  });

  return NextResponse.json({
    ...updated,
    visibleSupplierIds: updated?.visibleSuppliers.map((v) => v.supplierId) ?? [],
  });
}

// DELETE /api/users/[id]
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const { user } = await requireAuth(["admin"]);
  if (user?.id === userId) {
    return NextResponse.json({ error: "不能删除自己的账号" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });

  await prisma.auditLog.create({
    data: { action: "DELETE_USER", entityType: "user", entityId: userId },
  });

  return NextResponse.json({ success: true });
}
