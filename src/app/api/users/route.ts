import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { UserRole } from "@/lib/types";
import bcrypt from "bcryptjs";

// GET /api/users - 获取用户列表（仅管理员）
export async function GET() {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
      visibleSuppliers: {
        select: { supplierId: true },
      },
    },
  });

  return NextResponse.json({
    data: users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      productCount: 0,
      createdAt: u.createdAt,
      visibleSupplierIds: u.visibleSuppliers.map((v) => v.supplierId),
    })),
  });
}

// POST /api/users - 创建新用户（仅管理员）
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = await req.json();
  const { username, displayName, password, role } = body;

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "用户名和密码为必填" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "密码长度至少8位" }, { status: 400 });
  }

  const validRoles: UserRole[] = ["admin", "editor", "viewer"];
  const userRole: UserRole = validRoles.includes(role) ? role : "viewer";

  const existing = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
  });
  if (existing) {
    return NextResponse.json({ error: "该用户名已存在" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username: username.trim().toLowerCase(),
      displayName: displayName?.trim() || null,
      passwordHash,
      role: userRole,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });

  // 审计日志
  await prisma.auditLog.create({
    data: {
      action: "CREATE_USER",
      entityType: "user",
      entityId: user.id,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
