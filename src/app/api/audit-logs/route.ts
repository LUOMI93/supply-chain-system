import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

// GET /api/audit-logs - 获取审计日志列表（仅管理员）
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
  const action = searchParams.get("action") || undefined;
  const entityType = searchParams.get("entityType") || undefined;
  const userId = searchParams.get("userId") ? parseInt(searchParams.get("userId")!) : undefined;

  const where: {
    action?: string;
    entityType?: string;
    userId?: number;
  } = {};
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (userId && !isNaN(userId)) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { id: true, username: true, displayName: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    data: logs.map((log) => ({
      id: log.id,
      user: log.user
        ? {
            id: log.user.id,
            username: log.user.username,
            displayName: log.user.displayName,
          }
        : null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      detail: log.detail,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
