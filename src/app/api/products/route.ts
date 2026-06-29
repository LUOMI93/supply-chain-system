import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, getSessionUser } from "@/lib/auth-utils";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

// GET /api/products — 产品列表（分页 + 搜索）或单个产品（?id=）
export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);

  // 单个产品查询
  const singleId = searchParams.get("id");
  if (singleId) {
    const id = parseInt(singleId);
    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的产品 ID" }, { status: 400 });
    }
    const product = await prisma.productGroup.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: true,
        specs: { orderBy: { id: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!product) {
      return NextResponse.json({ error: "产品不存在" }, { status: 404 });
    }
    // viewer 过滤敏感数据
    if (user?.role === "viewer") {
      return NextResponse.json({
        data: [{
          ...product,
          supplier: null,
          productLink: null,
          remark: null,
          specs: product.specs.map((spec) => ({ ...spec, costPrice: null })),
        }],
      });
    }
    return NextResponse.json({ data: [product] });
  }

  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50")));
  const search = searchParams.get("search") || "";
  const supplierId = searchParams.get("supplierId") ? parseInt(searchParams.get("supplierId")!) : undefined;

  const where: Prisma.ProductGroupWhereInput = {
    // 默认过滤掉软删除的产品
    deletedAt: null,
  };

  // 非 admin 用户：根据可见供应商过滤
  if (user && user.role !== "admin") {
    const visibleIds = await prisma.userSupplierVisibility.findMany({
      where: { userId: user.id },
      select: { supplierId: true },
    });
    // visibleIds 为空时不可见任何供应商（而非显示全部）
    where.supplierId = { in: visibleIds.map((v) => v.supplierId) };
  }

  if (supplierId) {
    // 用户手动筛选时，叠加可见供应商限制
    if (where.supplierId && typeof where.supplierId === "object" && "in" in where.supplierId) {
      const allowedIds = (where.supplierId as Prisma.IntFilter).in as number[];
      if (!allowedIds.includes(supplierId)) {
        // 用户选了不可见的供应商，返回空
        where.supplierId = { equals: -1 };
      } else {
        where.supplierId = supplierId;
      }
    } else {
      where.supplierId = supplierId;
    }
  }

  if (search) {
    where.OR = [
      { sku: { contains: search } },
      { name: { contains: search } },
      { supplier: { name: { contains: search } } },
      { specs: { some: { sku: { contains: search } } } },
      { specs: { some: { spec: { contains: search } } } },
      { specs: { some: { carModel: { contains: search } } } },
      { specs: { some: { oeCode: { contains: search } } } },
    ];
  }

  const [groups, total] = await Promise.all([
    prisma.productGroup.findMany({
      where,
      include: {
        supplier: true,
        specs: { orderBy: { id: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: "asc" },
    }),
    prisma.productGroup.count({ where }),
  ]);

  // viewer 角色：过滤敏感数据（拿货价格、产品链接、供应商、备注）
  const data = user?.role === "viewer"
    ? groups.map((g) => ({
        ...g,
        supplier: null,
        productLink: null,
        remark: null,
        specs: g.specs.map((spec) => ({
          ...spec,
          costPrice: null,
        })),
      }))
    : groups;

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// POST /api/products — 新增产品
export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth(["admin", "editor"]);
  if (error) return error;

  const body = await req.json();
  const { sku, supplierId, name, productLink, productWeight, productSize, packageSize, packageWeight, boxQuantity, isPublic, remark, specs, images } = body;

  if (!sku || !name || !supplierId) {
    return NextResponse.json({ error: "SKU、产品名称、供应商为必填" }, { status: 400 });
  }

  // 保存图片
  const imageRecords: { filePath: string; fileSize: number; sortOrder: number }[] = [];
  if (images && Array.isArray(images)) {
    for (let i = 0; i < images.length; i++) {
      const dataUrl = images[i];
      if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
        try {
          const filePath = await saveBase64Image(dataUrl, sku, i);
          imageRecords.push({ filePath, fileSize: 0, sortOrder: i });
        } catch {
          // 跳过无效图片
        }
      }
    }
  }

  const specCreateData: Prisma.ProductSpecCreateWithoutGroupInput[] = (specs || []).map((s: Record<string, unknown>) => ({
    sku: String(s.sku || `${sku}-${Date.now()}`),
    factoryCode: s.factoryCode ? String(s.factoryCode) : null,
    spec: s.spec ? String(s.spec) : null,
    costPrice: s.costPrice != null ? String(s.costPrice) : null,
    salePrice: s.salePrice != null ? String(s.salePrice) : null,
    carModel: s.carModel ? String(s.carModel) : null,
    oeCode: s.oeCode ? String(s.oeCode) : null,
  }));

  try {
    const product = await prisma.productGroup.create({
      data: {
        sku,
        supplierId: parseInt(supplierId),
        name,
        productLink: productLink || null,
        productWeight: productWeight || null,
        productSize: productSize || null,
        packageSize: packageSize || null,
        packageWeight: packageWeight || null,
        boxQuantity: boxQuantity || null,
        isPublic: isPublic !== false,
        remark: remark || null,
        createdBy: user!.id,
        specs: { create: specCreateData },
        images: { create: imageRecords },
      },
      include: { specs: true, images: true, supplier: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user!.id,
        action: "CREATE",
        entityType: "product_group",
        entityId: product.id,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta?.target as string[]) ?? [];
      if (target.includes("sku")) {
        return NextResponse.json({ error: "产品组SKU 已存在" }, { status: 400 });
      }
    }
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: `创建失败: ${msg}` }, { status: 500 });
  }
}

// PUT /api/products — 编辑产品
export async function PUT(req: NextRequest) {
  const { error, user } = await requireAuth(["admin", "editor"]);
  if (error) return error;

  const body = await req.json();
  const { id, sku, supplierId, name, productLink, productWeight, productSize, packageSize, packageWeight, boxQuantity, isPublic, remark, specs, images } = body;

  const productId = parseInt(id);
  if (isNaN(productId)) {
    return NextResponse.json({ error: "无效的产品 ID" }, { status: 400 });
  }

  if (!sku || !name || !supplierId) {
    return NextResponse.json({ error: "SKU、产品名称、供应商为必填" }, { status: 400 });
  }

  // 查找现有产品
  const existing = await prisma.productGroup.findFirst({
    where: { id: productId, deletedAt: null },
    include: { specs: true, images: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "产品不存在" }, { status: 404 });
  }

  try {
    // 处理规格：找出需要创建、更新、删除的
    const incomingSpecIds: number[] = [];
    const specUpdates: { id: number; data: Prisma.ProductSpecUpdateInput }[] = [];
    const specCreates: Prisma.ProductSpecCreateWithoutGroupInput[] = [];

    if (specs && Array.isArray(specs)) {
      for (const s of specs) {
        if (s.id && typeof s.id === "number") {
          incomingSpecIds.push(s.id);
          specUpdates.push({
            id: s.id,
            data: {
              sku: String(s.sku || `${sku}-${Date.now()}`),
              factoryCode: s.factoryCode != null ? String(s.factoryCode) : null,
              spec: s.spec != null ? String(s.spec) : null,
              costPrice: s.costPrice != null ? String(s.costPrice) : null,
              salePrice: s.salePrice != null ? String(s.salePrice) : null,
              carModel: s.carModel != null ? String(s.carModel) : null,
              oeCode: s.oeCode != null ? String(s.oeCode) : null,
            },
          });
        } else {
          specCreates.push({
            sku: String(s.sku || `${sku}-${Date.now()}`),
            factoryCode: s.factoryCode != null ? String(s.factoryCode) : null,
            spec: s.spec != null ? String(s.spec) : null,
            costPrice: s.costPrice != null ? String(s.costPrice) : null,
            salePrice: s.salePrice != null ? String(s.salePrice) : null,
            carModel: s.carModel != null ? String(s.carModel) : null,
            oeCode: s.oeCode != null ? String(s.oeCode) : null,
          });
        }
      }
    }

    // 删除不再需要的规格
    const existingSpecIds = existing.specs.map((s) => s.id);
    const specIdsToDelete = existingSpecIds.filter((id) => !incomingSpecIds.includes(id));

    // 处理图片：删除旧图片，保存新图片
    const imageRecords: { filePath: string; fileSize: number; sortOrder: number }[] = [];
    const oldImagePaths = existing.images.map((i) => i.filePath);

    // 区分已有图片路径和新上传的 base64
    const newBase64Images: string[] = [];
    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (typeof img === "string" && img.startsWith("data:")) {
          // 新上传的 base64 图片
          newBase64Images.push(img);
        } else if (typeof img === "string" && img.startsWith("/")) {
          // 已有图片路径，保留
          imageRecords.push({ filePath: img, fileSize: 0, sortOrder: i });
        }
      }
    }

    // 保存新的 base64 图片
    for (const dataUrl of newBase64Images) {
      try {
        const filePath = await saveBase64Image(dataUrl, sku, imageRecords.length);
        imageRecords.push({ filePath, fileSize: 0, sortOrder: imageRecords.length });
      } catch {
        // 跳过无效图片
      }
    }

    // 删除不再引用的旧图片文件（仅删除文件系统上的，数据库通过 onDelete: Cascade 或手动删）
    const keptPaths = new Set(imageRecords.filter((r) => r.filePath.startsWith("/")).map((r) => r.filePath));
    for (const oldPath of oldImagePaths) {
      if (!keptPaths.has(oldPath)) {
        try {
          const fsPath = path.join(process.cwd(), "public", oldPath);
          await unlink(fsPath);
        } catch {
          // 文件可能已不存在，忽略
        }
      }
    }

    // 在事务中执行所有操作
    const product = await prisma.$transaction(async (tx) => {
      // 删除不再需要的规格
      if (specIdsToDelete.length > 0) {
        await tx.productSpec.deleteMany({
          where: { id: { in: specIdsToDelete } },
        });
      }

      // 更新已有规格
      for (const spec of specUpdates) {
        await tx.productSpec.update({
          where: { id: spec.id },
          data: spec.data,
        });
      }

      // 删除旧图片记录
      await tx.productImage.deleteMany({
        where: { groupId: productId },
      });

      // 更新产品组
      return tx.productGroup.update({
        where: { id: productId },
        data: {
          sku,
          supplierId: parseInt(supplierId),
          name,
          productLink: productLink || null,
          productWeight: productWeight || null,
          productSize: productSize || null,
          packageSize: packageSize || null,
          packageWeight: packageWeight || null,
          boxQuantity: boxQuantity || null,
          isPublic: isPublic !== false,
          remark: remark || null,
          version: (existing.version || 1) + 1,
          updatedBy: user!.id,
          specs: { create: specCreates },
          images: { create: imageRecords },
        },
        include: { specs: true, images: true, supplier: true },
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: user!.id,
        action: "UPDATE",
        entityType: "product_group",
        entityId: product.id,
      },
    });

    return NextResponse.json(product);
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta?.target as string[]) ?? [];
      if (target.includes("sku")) {
        return NextResponse.json({ error: "产品组SKU 已存在" }, { status: 400 });
      }
    }
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: `更新失败: ${msg}` }, { status: 500 });
  }
}

// DELETE /api/products — 批量软删除产品
export async function DELETE(req: NextRequest) {
  const { error, user } = await requireAuth(["admin", "editor"]);
  if (error) return error;

  try {
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "请选择要删除的产品" }, { status: 400 });
    }

    const numIds = ids.map((id: unknown) => parseInt(String(id))).filter((n: number) => !isNaN(n));
    if (numIds.length === 0) {
      return NextResponse.json({ error: "无效的产品 ID" }, { status: 400 });
    }

    // 批量软删除
    const updated = await prisma.productGroup.updateMany({
      where: {
        id: { in: numIds },
        deletedAt: null, // 不重复删除
      },
      data: { deletedAt: new Date() },
    });

    // 记录审计日志（批量记录为一条）
    try {
      await prisma.auditLog.create({
        data: {
          userId: user!.id,
          action: "DELETE",
          entityType: "product_group",
          detail: `批量删除 ${updated.count} 个产品`,
        },
      });
    } catch {
      // 审计日志失败不影响主操作
    }

    return NextResponse.json({
      success: true,
      count: updated.count,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: `删除失败: ${msg}` }, { status: 500 });
  }
}

// Helper: save base64 image to filesystem
async function saveBase64Image(dataUrl: string, sku: string, index: number): Promise<string> {
  const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid data URL");

  const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
  const buffer = Buffer.from(matches[2], "base64");

  const uploadDir = path.join(process.cwd(), "public", "uploads", sku);
  await mkdir(uploadDir, { recursive: true });

  const filename = `${sku}_${index + 1}.${ext}`;
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return `/uploads/${sku}/${filename}`;
}
