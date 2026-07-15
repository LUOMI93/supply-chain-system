import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { readFile } from "fs/promises";
import { getUploadFilePath } from "@/lib/uploads";

// 产品数据列定义（"产品图片"列不填文字，图片直接嵌入单元格）
const getColumns = () => [
  { header: "产品组SKU", key: "groupSku", width: 14 },
  { header: "产品图片", key: "images", width: 30 },
  { header: "产品名称", key: "name", width: 26 },
  { header: "供应商", key: "supplier", width: 16 },
  { header: "产品规格", key: "spec", width: 20 },
  { header: "规格SKU", key: "specSku", width: 14 },
  { header: "OE码", key: "oeCode", width: 18 },
  { header: "拿货价格(元)", key: "costPrice", width: 14 },
  { header: "销售价格(元)", key: "salePrice", width: 14 },
  { header: "适配车型", key: "carModel", width: 26 },
  { header: "产品链接", key: "productLink", width: 30 },
  { header: "产品重量", key: "productWeight", width: 12 },
  { header: "产品尺寸", key: "productSize", width: 16 },
  { header: "包装重量", key: "packageWeight", width: 12 },
  { header: "包装尺寸", key: "packageSize", width: 16 },
  { header: "装箱数", key: "boxQuantity", width: 12 },
  { header: "备注", key: "remark", width: 28 },
];

function sanitizeSheetName(name: string, index: number): string {
  const cleaned = name.replace(/[:\\/?*\[\]]/g, "_").slice(0, 28);
  return cleaned || `供应商${index + 1}`;
}

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAuth(["admin", "editor"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    // 支持多供应商筛选：supplierIds=1,2,3 或单个 supplierId
    let supplierIds: number[] = [];
    const supplierIdsStr = searchParams.get("supplierIds");
  const singleSupplierId = searchParams.get("supplierId");

  if (supplierIdsStr) {
    supplierIds = supplierIdsStr
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));
  } else if (singleSupplierId) {
    const id = parseInt(singleSupplierId);
    if (!isNaN(id)) supplierIds = [id];
  }

  // 1. 先查供应商（用于分 sheet），admin/editor 默认可导出全部数据
  const supplierWhere: Prisma.SupplierWhereInput = {};
  if (supplierIds.length > 0) {
    supplierWhere.id = { in: supplierIds };
  }
  const suppliers = await prisma.supplier.findMany({
    where: supplierWhere,
    orderBy: { name: "asc" },
  });

  if (suppliers.length === 0) {
    return NextResponse.json(
      { error: "没有符合条件的供应商数据" },
      { status: 400 }
    );
  }

  // 2. 准备 workbook 和通用工具函数
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "供应链管理系统";
  workbook.created = new Date();

  const imageCache = new Map<string, Buffer>();

  async function loadImageBuffer(filePath: string): Promise<Buffer | null> {
    if (imageCache.has(filePath)) {
      return imageCache.get(filePath)!;
    }
    try {
      const fullPath = getUploadFilePath(filePath);
      const buf = await readFile(fullPath);
      imageCache.set(filePath, buf);
      return buf;
    } catch {
      return null;
    }
  }

  // 将多张图片水平合并成一张大图（使用 sharp）
  async function mergeImagesHorizontal(buffers: Buffer[]): Promise<Buffer | null> {
    try {
      const sharp = await import("sharp").then((m) => m.default).catch(() => null);
      if (!sharp) return null;

      const targetHeight = 120;
      const resizedBuffers: Buffer[] = [];
      let totalWidth = 0;
      const gap = 10;

      for (const buf of buffers) {
        const resized = await sharp(buf)
          .resize(null, targetHeight, { fit: "inside" })
          .png()
          .toBuffer();
        const meta = await sharp(resized).metadata();
        totalWidth += (meta.width || targetHeight) + gap;
        resizedBuffers.push(resized);
      }

      totalWidth -= gap;

      const composite: { input: Buffer; left: number; top: number }[] = [];
      let currentLeft = 0;
      for (const buf of resizedBuffers) {
        const meta = await sharp(buf).metadata();
        composite.push({ input: buf, left: currentLeft, top: 0 });
        currentLeft += (meta.width || targetHeight) + gap;
      }

      return await sharp({
        create: {
          width: totalWidth,
          height: targetHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        },
      })
        .composite(composite)
        .png()
        .toBuffer();
    } catch {
      return null;
    }
  }

  // 3. 为每个供应商创建一个 sheet
  const MAX_EXPORT_GROUPS = 2000;
  const usedSheetNames = new Set<string>();

  for (let sIdx = 0; sIdx < suppliers.length; sIdx++) {
    const supplier = suppliers[sIdx];

    // 构建查询条件
    const where: Prisma.ProductGroupWhereInput = {
      deletedAt: null,
      supplierId: supplier.id,
    };

    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { name: { contains: search } },
        { specs: { some: { sku: { contains: search } } } },
        { specs: { some: { spec: { contains: search } } } },
        { specs: { some: { carModel: { contains: search } } } },
        { specs: { some: { oeCode: { contains: search } } } },
      ];
    }

    const groups = await prisma.productGroup.findMany({
      where,
      include: {
        supplier: true,
        specs: { orderBy: { id: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { id: "asc" },
      take: MAX_EXPORT_GROUPS,
    });

    // 确保 sheet 名唯一
    let baseSheetName = sanitizeSheetName(supplier.name, sIdx);
    let sheetName = baseSheetName;
    let suffix = 1;
    while (usedSheetNames.has(sheetName)) {
      sheetName = sanitizeSheetName(baseSheetName.slice(0, 25) + String(suffix), sIdx);
      suffix++;
    }
    usedSheetNames.add(sheetName);

    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    const columns = getColumns();
    sheet.columns = columns;

    // 设置表头
    const headerRow = sheet.getRow(1);
    headerRow.font = { name: "微软雅黑", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF244B35" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    headerRow.height = 28;

    // 第一阶段：写入所有行数据，记录合并信息和图片信息
    const mergeTasks: Array<{
      startRow: number;
      endRow: number;
      images: typeof groups[0]["images"];
    }> = [];

    let rowIndex = 2;
    for (const group of groups) {
      const specs =
        group.specs.length > 0
          ? group.specs
          : [null as unknown as (typeof group.specs)[number]];

      const groupStartRow = rowIndex;
      const groupEndRow = rowIndex + specs.length - 1;

      for (let specIdx = 0; specIdx < specs.length; specIdx++) {
        const spec = specs[specIdx];
        const row = sheet.getRow(rowIndex);

        // 图片列（第 2 列）不填充文字，只靠图片嵌入
        const rowData = {
          groupSku: group.sku,
          images: "",
          name: group.name,
          supplier: group.supplier.name,
          spec: spec?.spec || "",
          specSku: spec?.sku || "",
          oeCode: spec?.oeCode || "",
          costPrice: spec?.costPrice ?? "",
          salePrice: spec?.salePrice ?? "",
          carModel: spec?.carModel || "",
          productLink: group.productLink || "",
          productWeight: group.productWeight || "",
          productSize: group.productSize || "",
          packageWeight: group.packageWeight || "",
          packageSize: group.packageSize || "",
          boxQuantity: group.boxQuantity || "",
          remark: group.remark || "",
        };

        row.values = Object.values(rowData);
        row.font = { name: "微软雅黑", size: 10 };
        row.alignment = { vertical: "middle", wrapText: true };
        // 紧凑行高，有图片的行后面再单独调高
        row.height = 22;

        if (rowIndex % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF5F8F5" },
          };
        }

        row.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
        row.getCell(9).alignment = { horizontal: "right", vertical: "middle" };

        rowIndex++;
      }

      mergeTasks.push({
        startRow: groupStartRow,
        endRow: groupEndRow,
        images: group.images,
      });
    }

    // 第二阶段：统一合并单元格（同一产品组前4列、后7列合并）
    for (const task of mergeTasks) {
      const { startRow, endRow } = task;
      if (startRow === endRow) continue;

      sheet.mergeCells(startRow, 1, endRow, 1);
      sheet.mergeCells(startRow, 2, endRow, 2);
      sheet.mergeCells(startRow, 3, endRow, 3);
      sheet.mergeCells(startRow, 4, endRow, 4);
      sheet.mergeCells(startRow, 11, endRow, 11);
      sheet.mergeCells(startRow, 12, endRow, 12);
      sheet.mergeCells(startRow, 13, endRow, 13);
      sheet.mergeCells(startRow, 14, endRow, 14);
      sheet.mergeCells(startRow, 15, endRow, 15);
      sheet.mergeCells(startRow, 16, endRow, 16);
      sheet.mergeCells(startRow, 17, endRow, 17);
    }

    // 第三阶段：嵌入图片（在每个产品组的图片列单元格）
    for (const task of mergeTasks) {
      const { startRow, images } = task;
      if (images.length === 0) continue;

      try {
        const maxImages = Math.min(images.length, 4);
        const imageBuffers: Buffer[] = [];
        let firstFilePath = "";

        for (let imgIdx = 0; imgIdx < maxImages; imgIdx++) {
          const image = images[imgIdx];
          if (imgIdx === 0) firstFilePath = image.filePath;
          const imageBuffer = await loadImageBuffer(image.filePath);
          if (imageBuffer) imageBuffers.push(imageBuffer);
        }

        if (imageBuffers.length > 0) {
          let finalBuffer: Buffer;
          let isMerged = false;

          if (imageBuffers.length > 1) {
            const merged = await mergeImagesHorizontal(imageBuffers);
            if (merged) {
              finalBuffer = merged;
              isMerged = true;
            } else {
              finalBuffer = imageBuffers[0];
            }
          } else {
            finalBuffer = imageBuffers[0];
          }

          // 合并后的图片始终是 PNG；单张图片根据文件扩展名判断格式
          let extension: "png" | "jpeg" = "png";
          if (!isMerged) {
            const ext = firstFilePath.toLowerCase().split(".").pop() || "";
            extension = ext === "jpg" || ext === "jpeg" ? "jpeg" : "png";
          }

          const workbookImage = workbook.addImage({
            buffer: finalBuffer as any,
            extension,
          });

          // 图片列是第 2 列（B 列），在当前产品组的起始行
          const cellRef = `B${startRow}:B${startRow}`;
          sheet.addImage(workbookImage, cellRef);

          // 根据图片高度调整行高：120px ≈ 90 磅，均摊到合并行
          const rowCount = task.endRow - task.startRow + 1;
          const imageHeightPoints = 90;
          const currentTotal = 22 * rowCount;
          if (currentTotal < imageHeightPoints) {
            const newRowHeight = Math.ceil(imageHeightPoints / rowCount);
            for (let r = task.startRow; r <= task.endRow; r++) {
              sheet.getRow(r).height = newRowHeight;
            }
          }
        }
      } catch (e) {
        console.error("[EXPORT] 图片嵌入失败:", e);
      }
    }

    // 第四阶段：添加表格边框
    const lastRow = rowIndex - 1;
    if (lastRow >= 1) {
      for (let r = 1; r <= lastRow; r++) {
        const row = sheet.getRow(r);
        for (let c = 1; c <= columns.length; c++) {
          row.getCell(c).border = {
            top: { style: "thin", color: { argb: "FFAEBDAE" } },
            left: { style: "thin", color: { argb: "FFAEBDAE" } },
            bottom: { style: "thin", color: { argb: "FFAEBDAE" } },
            right: { style: "thin", color: { argb: "FFAEBDAE" } },
          };
        }
      }
    }
  }

  // 4. 写入 buffer
  const buffer = await workbook.xlsx.writeBuffer();

  const filename = `产品导出_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="export.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
  } catch (e: unknown) {
    console.error("[EXPORT ERROR]", e);
    const msg = e instanceof Error ? e.message : "导出失败";
    return NextResponse.json({ error: `导出失败: ${msg}` }, { status: 500 });
  }
}
