import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function GET() {
  const { error, user } = await requireAuth(["admin", "editor", "viewer"]);
  if (error) return error;

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 非 admin 用户：获取可见供应商过滤（visibleIds 为空时不可见任何供应商）
    let supplierIdsFilter: number[] | undefined;
    if (user && user.role !== "admin") {
      const visibleIds = await prisma.userSupplierVisibility.findMany({
        where: { userId: user.id },
        select: { supplierId: true },
      });
      supplierIdsFilter = visibleIds.map((v) => v.supplierId);
    }

    const groupWhere = {
      deletedAt: null,
      ...(supplierIdsFilter ? { supplierId: { in: supplierIdsFilter } } : {}),
    };

    // Parallel queries for performance
    const [
      totalGroups,
      totalSuppliers,
      totalSpecs,
      totalImages,
      recentGroupsCount,
      supplierBreakdown,
      recentActivity,
    ] = await Promise.all([
      // Total non-deleted product groups
      prisma.productGroup.count({ where: groupWhere }),

      // Total suppliers
      supplierIdsFilter
        ? prisma.supplier.count({ where: { id: { in: supplierIdsFilter } } })
        : prisma.supplier.count(),

      // Total product specs (only for non-deleted groups)
      prisma.productSpec.count({
        where: { group: groupWhere },
      }),

      // Total product images (only for non-deleted groups)
      prisma.productImage.count({
        where: { group: groupWhere },
      }),

      // Products added in last 7 days
      prisma.productGroup.count({
        where: {
          ...groupWhere,
          createdAt: { gte: sevenDaysAgo },
        },
      }),

      // Top 5 suppliers by product count
      (supplierIdsFilter
        ? prisma.supplier.findMany({
            where: { id: { in: supplierIdsFilter } },
            select: {
              id: true,
              name: true,
              _count: { select: { groups: { where: { deletedAt: null } } } },
            },
            orderBy: { groups: { _count: "desc" } },
            take: 5,
          })
        : prisma.supplier.findMany({
            select: {
              id: true,
              name: true,
              _count: { select: { groups: { where: { deletedAt: null } } } },
            },
            orderBy: { groups: { _count: "desc" } },
            take: 5,
          })),

      // Recent audit log activity (last 5)
      prisma.auditLog.findMany({
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          detail: true,
          createdAt: true,
          user: { select: { username: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      totalGroups,
      totalSuppliers,
      totalSpecs,
      totalImages,
      recentGroupsCount,
      supplierBreakdown: supplierBreakdown.map((s) => ({
        id: s.id,
        name: s.name,
        count: s._count.groups,
      })),
      recentActivity: recentActivity.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        detail: log.detail,
        createdAt: log.createdAt.toISOString(),
        user: log.user
          ? log.user.displayName || log.user.username
          : "系统",
      })),
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return NextResponse.json({ error: "统计失败" }, { status: 500 });
  }
}
