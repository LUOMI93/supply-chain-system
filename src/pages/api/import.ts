import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import type { UserRole } from "@/lib/types";
import { writeFile, mkdir, readdir, unlink, rmdir, readFile } from "fs/promises";
import path from "path";
import ExcelJS from "exceljs";
import formidable from "formidable";

type ExcelRowData = Record<string, unknown>;

// ========== 工具函数（导入前校验/净化） ==========

// 列名标准化：trim 并做模糊匹配，返回规范列名
// 支持：空格变体、简繁、大小写、括号全角/半角
function normalizeColName(raw: string): string {
  const m = raw.replace(/[\s\u3000]+/g, "").toLowerCase(); // 去所有空白
  const aliasMap: Record<string, string> = {
    // 产品组SKU
    "产品组sku": "产品组SKU",
    "产品组编号": "产品组SKU",
    "组sku": "产品组SKU",
    // 产品名称
    "产品名": "产品名称",
    "名称": "产品名称",
    "产品名臣": "产品名称",
    // 供应商
    "供货商": "供应商",
    "供应方": "供应商",
    // 规格SKU
    "规格sku": "规格SKU",
    "规格编号": "规格SKU",
    // 工厂编号
    "工厂编码": "工厂编号",
    "厂编": "工厂编号",
    // 产品规格
    "规格": "产品规格",
    "型号": "产品规格",
    // 拿货价格
    "拿货价": "拿货价格(元)",
    "成本": "拿货价格(元)",
    "成本价": "拿货价格(元)",
    // 销售价格
    "销售价": "销售价格(元)",
    "售价": "销售价格(元)",
    "单价": "销售价格(元)",
    // 适配车型
    "车型": "适配车型",
    "适用车型": "适配车型",
    // OE码
    "oecode": "OE码",
    "oe编号": "OE码",
    // 产品链接
    "链接": "产品链接",
    "url": "产品链接",
    // 是否公开
    "公开": "是否公开",
    "是否公开显示": "是否公开",
  };
  return aliasMap[m] || raw.trim();
}

// 构建列名映射（一次构建，全文件复用）
// 返回：Map<规范列名, 实际列名>
function buildColMap(firstRow: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>();
  const standardCols = [
    "产品组SKU", "产品名称", "供应商",
    "规格SKU", "工厂编号", "产品规格",
    "拿货价格(元)", "销售价格(元)",
    "适配车型", "OE码",
    "产品链接", "产品重量", "产品尺寸",
    "包装重量", "包装尺寸", "装箱数",
    "是否公开", "备注",
    "图片URL", "图片", "产品图片",
  ];
  for (const key of Object.keys(firstRow)) {
    const norm = normalizeColName(key);
    if (norm && !map.has(norm)) {
      map.set(norm, key); // 保留原始 key 用于 row[key] 取值
    }
  }
  return map;
}

// 安全读取列值（自动做列名映射）
function getColValue(
  row: Record<string, unknown>,
  colMap: Map<string, string>,
  standardName: string
): unknown {
  const actualKey = colMap.get(standardName);
  if (actualKey) return row[actualKey];
  // fallback：直接读（向后兼容）
  return row[standardName];
}

// SKU 文件名净化：移除路径分隔符与特殊字符，防止路径穿越
function sanitizeSkuForFilename(sku: string): string {
  return sku.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// isPublic 解析：支持多种中英文表示法，大小写不敏感
// 真值：是、对、公开、y、yes、true、1、Y、T、TRUE 等
// 假值：否、不对、不公开、private、n、no、false、0、N、F、FALSE 等
// 空值或无法识别：返回 null（由调用方决定默认值）
function parseIsPublicValue(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (v === "") return null;
  const truthy = ["是", "对", "公开", "y", "yes", "true", "1", "t"];
  const falsy = ["否", "不", "不公开", "私有", "private", "n", "no", "false", "0", "f"];
  if (truthy.includes(v)) return true;
  if (falsy.includes(v)) return false;
  return null;
}

// 价格处理：原值直接返回（支持纯数字和文字如"待定""面议"等）
// 空字符串返回 null
function parsePrice(raw: string, _lineNum: number, _fieldName: string): string | null {
  const v = raw.trim();
  return v === "" ? null : v;
}

// 图片 URL 协议白名单验证：仅允许 http:// 与 https://，忽略Excel公式
function isValidImageUrl(url: string): boolean {
  // 忽略Excel公式（以 = 开头）
  if (url.trim().startsWith('=')) {
    return false;
  }
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return false;
    }
    // SSRF 防护：禁止访问内网/私有地址
    if (isPrivateOrLocalHost(u.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// SSRF 防护：检测私有 IP、localhost、链路本地地址等
function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase().trim();

  // localhost 系列
  if (h === "localhost" || h === "::1" || h.endsWith(".localhost")) {
    return true;
  }

  // IPv4
  const ipMatch = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipMatch) {
    const [, a, b] = ipMatch.map(Number) as unknown as number[];
    // 10.0.0.0/8
    if (a === 10) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 127.0.0.0/8 (loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (link-local / cloud metadata)
    if (a === 169 && b === 254) return true;
    // 0.0.0.0/8
    if (a === 0) return true;
  }

  // IPv6 私有/链路本地
  if (h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) {
    return true;
  }

  return false;
}

// 图片下载最大大小：10MB
const MAX_IMAGE_DOWNLOAD_BYTES = 10 * 1024 * 1024;

// Pages Router body parser 配置：禁用默认 parser，由 formidable 处理
// 支持最大 200MB 文件上传
export const config = {
  api: {
    bodyParser: false,
  },
};

// POST /api/import — 批量导入产品数据（含图片处理）
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Auth check — 使用 getToken 替代 auth()，避免 Pages Router 中 next-auth 的 next/server 模块解析错误
  const token = await getToken({
    // NextApiRequest.headers 是 Record<string, string | string[] | undefined>，
    // getToken 需要 Record<string, string>，做类型转换
    req: { headers: req.headers as Record<string, string> },
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  });
  if (!token?.id) {
    return res.status(401).json({ error: "请先登录" });
  }
  const userRole: UserRole = (token.role as UserRole) || "viewer";
  if (!["admin", "editor"].includes(userRole)) {
    return res.status(403).json({ error: "权限不足" });
  }
  const userId = Number(token.id);

  try {
    // 使用 formidable 解析文件（支持最高 200MB）
    console.log("[Import] Starting to parse file...");
    const form = formidable({
      maxFileSize: 200 * 1024 * 1024, // 200MB
      maxFiles: 1,
    });
    const [fields, files] = await form.parse(req);
    console.log("[Import] File parsed, fields:", Object.keys(fields), "files:", Object.keys(files));
    const uploadedFile = files.file?.[0]; // formidable v3: 字段值是数组
    console.log("[Import] uploadedFile:", uploadedFile ? `${uploadedFile.originalFilename} (${uploadedFile.size} bytes)` : "null");
    const imageUrlMapStr = fields.imageUrlMap?.[0] || null;

    if (!uploadedFile) {
      return res.status(400).json({ error: "请上传 Excel 文件" });
    }

    // 解析 Excel 文件（损坏文件可能抛异常，用 400 而非 500 返回）
    let buffer: Buffer | null = null;
    let rows: ExcelRowData[] = [];
    let imagesByRow: Map<number, Array<{ base64: string; ext: string }>> = new Map();
    
    try {
      console.log("[Import] Reading file from:", uploadedFile.filepath);
      buffer = await readFile(uploadedFile.filepath);
      console.log("[Import] File read, size:", buffer.length, "bytes");
      rows = await parseExcelRows(buffer);

      // 用 exceljs 提取 Excel 中嵌入的图片和它们的行位置
      imagesByRow = await extractImagesByRow(buffer);
    } catch {
      return res.status(400).json(
        { error: "Excel 文件格式无效或已损坏，请检查后重新上传" },
        );
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: "Excel 文件中没有数据" });
    }

    // 行数上限：5000 行（边界条件，防止超大文件导致内存溢出和超时）
    if (rows.length > 5000) {
      return res.status(400).json(
        { error: `数据行过多（${rows.length} 行），请拆分后分批导入（单次最多 5000 行）` },
        );
    }

    // 构建列名映射（一次构建，全文件复用）
    const colMap = buildColMap(rows[0]);
    console.log("[Import] 列名映射:", Object.fromEntries(colMap));

    // 检测 WPS 专有图片公式 =DISPIMG()，此类嵌入图片无法自动提取
    const hasWpsImages = rows.some(row =>
      Object.values(row).some(val => typeof val === "string" && val.trim().startsWith("=DISPIMG("))
    );
    const importWarnings: string[] = [];
    if (hasWpsImages) {
      importWarnings.push(
        "⚠️ 检测到 WPS 专有图片公式（=DISPIMG），嵌入图片无法自动提取。" +
        "解决方法：在 WPS 中将图片另存为文件后手动上传；或用 Excel 打开文件另存为 .xlsx 后重新导入。"
      );
    }

    // 检查必填列是否存在
    const requiredCols = ["产品组SKU", "产品名称", "供应商"];
    const missingCols = requiredCols.filter(c => !colMap.has(c));
    if (missingCols.length > 0) {
      return res.status(400).json(
        { error: `Excel 列名不匹配，未找到必填列: ${missingCols.join("、")}。\n检测到列: ${Object.keys(rows[0]).join("、")}` },
        );
    }

    const templateErrors = validateImportRows(rows, colMap);
    if (templateErrors.length > 0) {
      return res.status(400).json({
        error: `导入失败，请先修正模板内容:\n${templateErrors.join("\n")}`,
      });
    }

    const visibleSupplierIdSet = userRole === "admin"
      ? null
      : new Set(
          (await prisma.userSupplierVisibility.findMany({
            where: { userId },
            select: { supplierId: true },
          })).map((row) => row.supplierId)
        );

    // 3. 解析用户手动填写的图片URL映射
    let imageUrlMap: Record<string, string[]> = {};
    if (imageUrlMapStr) {
      try {
        imageUrlMap = JSON.parse(imageUrlMapStr);
      } catch {
        // 忽略解析错误
      }
    }

    // 待处理的图片任务（在事务外进行下载，避免网络请求拖长数据库事务）
    const pendingImageTasks: Array<{
      groupId: number;
      groupSku: string;
      lineNum: number;
      sources: Array<{ base64?: string; url?: string }>;
    }> = [];
    let deletedSpecCount = 0;

    // 使用事务包裹整个导入过程，保证原子性（全部成功或全部回滚）
    const result = await prisma.$transaction(async (tx) => {
      let importedGroups = 0;
      let importedSpecs = 0;
      const errors: string[] = [];
      const warnings: string[] = [];

      // 预先收集所有产品组的行号（用于图片按区间分配）
      // 只收集每个产品组首次出现的行，后续同组规格行不计入
      const groupLines: number[] = [];
      const seenGroupSkus = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const sku = String(getColValue(row, colMap, "产品组SKU") || "").trim();
        if (sku && !seenGroupSkus.has(sku)) {
          seenGroupSkus.add(sku);
          groupLines.push(i + 2);
        }
      }
      console.log(`[Import] 产品组行号:`, groupLines);

      // 图片匹配区间（按产品组区间分配，避免不同产品组匹配到相同图片）
      let currentGroupLine = 0;
      let nextGroupLine = Infinity;

      // 缓存：同一产品组多规格行时，后续行可继承第一行的字段值
      let prevGroupSku = "";
      const prevRowValues: Record<string, string> = {};
      const processedGroups = new Set<string>();
      // 跟踪每个产品组在 Excel 中出现的规格 SKU，用于清理已消失的规格
      const processedSpecSkus = new Map<string, Set<string>>();

      // 定义需要继承的字段（同一产品组内，后续行留空时从第一行继承）
      // 产品名称/供应商由 handler 层校验必填，此处做继承
      const inheritableFields = [
        "产品名称", "供应商",
        "产品链接", "产品重量", "产品尺寸",
        "包装尺寸", "包装重量", "装箱数", "是否公开", "备注",
      ];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNum = i + 2;
        const rowKey = String(lineNum);

        try {
          // 验证必填字段（使用列名映射）
          let rawGroupSku = String(getColValue(row, colMap, "产品组SKU") || "").trim();
          
          // 处理多规格行：同一产品组的后续行可以留空产品组SKU，从上一行继承
          const rowSpecSku = String(getColValue(row, colMap, "规格SKU") || "").trim() 
                          || String(getColValue(row, colMap, "工厂编号") || "").trim();
          if (!rawGroupSku && rowSpecSku && prevGroupSku) {
            rawGroupSku = prevGroupSku;
          }

          // 应用字段继承：同一产品组内，空白的可继承字段从上一行取值
          if (rawGroupSku === prevGroupSku && prevGroupSku) {
            for (const field of Object.keys(row)) {
              const normalized = normalizeColName(String(field));
              if (inheritableFields.includes(normalized)) {
                const val = String(row[field] || "").trim();
                if (!val && prevRowValues[normalized]) {
                  row[field] = prevRowValues[normalized];
                }
              }
            }
          }
          
          if (!rawGroupSku) {
            errors.push(`第${lineNum}行: 产品组SKU不能为空`);
            continue;
          }

          // 处理多规格行：同一产品组的后续行可以留空产品名称和供应商
          // （继承逻辑已在上方应用，此处读到的值已包含继承结果）
          let productName = String(getColValue(row, colMap, "产品名称") || "").trim();
          let supplierName = String(getColValue(row, colMap, "供应商") || "").trim();

          if (!productName) {
            errors.push(`第${lineNum}行: 产品名称不能为空`);
            continue;
          }
          if (!supplierName) {
            errors.push(`第${lineNum}行: 供应商不能为空`);
            continue;
          }

          // 保存当前行可继承字段的值，供同一产品组后续行继承
          for (const field of Object.keys(row)) {
            const normalized = normalizeColName(String(field));
            if (inheritableFields.includes(normalized)) {
              const val = String(row[field] || "").trim();
              if (val) prevRowValues[normalized] = val;
            }
          }

          // 更新产品组缓存，供后续行判断是否属于同组
          prevGroupSku = rawGroupSku;

          // 查找或创建供应商（使用 tx 保证事务内一致）
          // 注意：supplierName 已经 trim
          let supplier = await tx.supplier.findUnique({
            where: { name: supplierName },
          });
          if (!supplier) {
            if (userRole !== "admin") {
              errors.push(`第${lineNum}行: 供应商 "${supplierName}" 不存在，请联系管理员先创建并授权`);
              continue;
            }
            supplier = await tx.supplier.create({
              data: { name: supplierName },
            });
          }
          if (visibleSupplierIdSet && !visibleSupplierIdSet.has(supplier.id)) {
            errors.push(`第${lineNum}行: 无权导入供应商 "${supplierName}" 的产品`);
            continue;
          }

          const groupSku = rawGroupSku;

          // 处理产品组：先查找，再决定更新还是创建
          let group = await tx.productGroup.findUnique({
            where: { sku: groupSku },
          });
          if (group && visibleSupplierIdSet && !visibleSupplierIdSet.has(group.supplierId)) {
            errors.push(`第${lineNum}行: 无权更新产品组 "${groupSku}"`);
            continue;
          }

          if (group) {
            // 更新现有记录 - 使用关系连接
            group = await tx.productGroup.update({
              where: { id: group.id },
              data: {
                supplier: { connect: { id: supplier.id } },
                deletedAt: null,
                updater: { connect: { id: userId } },
                name: colMap.has("产品名称")
                  ? String(getColValue(row, colMap, "产品名称") || "").trim() || group.name
                  : group.name,
                productLink: colMap.has("产品链接")
                  ? String(getColValue(row, colMap, "产品链接") || "").trim() || null
                  : group.productLink,
                productWeight: colMap.has("产品重量")
                  ? String(getColValue(row, colMap, "产品重量") || "").trim() || null
                  : group.productWeight,
                productSize: colMap.has("产品尺寸")
                  ? String(getColValue(row, colMap, "产品尺寸") || "").trim() || null
                  : group.productSize,
                packageSize: colMap.has("包装尺寸")
                  ? String(getColValue(row, colMap, "包装尺寸") || "").trim() || null
                  : group.packageSize,
                packageWeight: colMap.has("包装重量")
                  ? String(getColValue(row, colMap, "包装重量") || "").trim() || null
                  : group.packageWeight,
                boxQuantity: colMap.has("装箱数")
                  ? String(getColValue(row, colMap, "装箱数") || "").trim() || null
                  : group.boxQuantity,
                isPublic: colMap.has("是否公开")
                  ? (() => {
                      const p = parseIsPublicValue(String(getColValue(row, colMap, "是否公开") || ""));
                      return p === null ? true : p;
                    })()
                  : group.isPublic,
                remark: colMap.has("备注")
                  ? String(getColValue(row, colMap, "备注") || "").trim() || null
                  : group.remark,
              },
            });
          } else {
            // 创建新记录 - 使用关系连接
            group = await tx.productGroup.create({
              data: {
                sku: groupSku,
                supplier: { connect: { id: supplier.id } },
                name: productName,
                creator: { connect: { id: userId } },
                updater: { connect: { id: userId } },
                productLink: colMap.has("产品链接")
                  ? String(getColValue(row, colMap, "产品链接") || "").trim() || null
                  : null,
                productWeight: colMap.has("产品重量")
                  ? String(getColValue(row, colMap, "产品重量") || "").trim() || null
                  : null,
                productSize: colMap.has("产品尺寸")
                  ? String(getColValue(row, colMap, "产品尺寸") || "").trim() || null
                  : null,
                packageSize: colMap.has("包装尺寸")
                  ? String(getColValue(row, colMap, "包装尺寸") || "").trim() || null
                  : null,
                packageWeight: colMap.has("包装重量")
                  ? String(getColValue(row, colMap, "包装重量") || "").trim() || null
                  : null,
                boxQuantity: colMap.has("装箱数")
                  ? String(getColValue(row, colMap, "装箱数") || "").trim() || null
                  : null,
                isPublic: colMap.has("是否公开")
                  ? (() => {
                      const p = parseIsPublicValue(String(getColValue(row, colMap, "是否公开") || ""));
                      return p === null ? true : p;
                    })()
                  : true,
                remark: colMap.has("备注")
                  ? String(getColValue(row, colMap, "备注") || "").trim() || null
                  : null,
              },
            });
          }

          // --- 处理图片 ---
          // 注意：图片下载移到事务外，避免慢网络请求拖长数据库事务超时
          const isFirstRowForGroup = !rows.some(
            (r, idx) => idx < i && String(getColValue(r, colMap, "产品组SKU") || "").trim() === groupSku
          );

          if (isFirstRowForGroup) {
            // 计算当前产品组的图片匹配区间（避免不同产品组匹配到相同图片）
            currentGroupLine = lineNum;
            const groupIdx = groupLines.indexOf(lineNum);
            nextGroupLine = groupLines[groupIdx + 1] ?? Infinity;
            console.log(`[Import] 产品组 ${rawGroupSku} 行${lineNum}: 图片匹配区间 [${currentGroupLine}, ${nextGroupLine})`);

            // A. 从 Excel 嵌入图片中查找（按产品组区间匹配）
            const imageSources: Array<{ base64?: string; url?: string }> = [];
            // 遍历 imagesByRow，只取在当前产品组区间内的图片
            // 不再做 base64 去重（不同图片的 base64 前50字符可能相同，导致误判）
            for (const [imgRowRaw, imgs] of imagesByRow.entries()) {
              const imgRow = Number(imgRowRaw);
              if (imgRow >= currentGroupLine && imgRow < nextGroupLine) {
                for (const img of imgs) {
                  imageSources.push({
                    base64: `data:image/${img.ext};base64,${img.base64}`,
                  });
                }
              }
            }

            // B. 从列读取图片URL（支持多列名）
            const imageUrlCol = getColValue(row, colMap, "图片URL")
                              || getColValue(row, colMap, "图片")
                              || getColValue(row, colMap, "产品图片");
            if (typeof imageUrlCol === "string" && imageUrlCol.trim()) {
              const val = imageUrlCol.trim();
              // 跳过 Excel/WPS 公式（如 =DISPIMG(...)，嵌入图片由 extractImagesByRow 处理）
              if (val.startsWith("=")) {
                // 静默跳过，不报错；实际图片会在步骤 A 中从 Excel 嵌入对象提取
              } else {
                const urls = val
                  .split(/[\n,;，；]+/)
                  .map((u) => u.trim())
                  .filter(Boolean);
                for (const url of urls) {
                  if (!isValidImageUrl(url)) {
                    // 非公式、非URL 的无效值，记录警告而非错误，不阻断导入
                    warnings.push(
                      `第${lineNum}行 (${groupSku}): 图片URL无效（已跳过）: ${url.slice(0, 80)}`
                    );
                    continue;
                  }
                  imageSources.push({ url });
                }
              }
            }

            // C. 从用户手动填写的图片URL映射中获取（带协议白名单校验）
            const manualUrls = imageUrlMap[rowKey];
            if (manualUrls && manualUrls.length > 0) {
              for (const url of manualUrls) {
                // isValidImageUrl 已经处理了Excel公式（返回false）
                // 对于无效的URL（包括Excel公式），跳过而不是报错
                if (isValidImageUrl(url)) {
                  imageSources.push({ url });
                }
                // 跳过无效URL（包括Excel公式），不报错
              }
            }

            // 记录待处理的图片任务，事务结束后再下载并写入数据库
            if (imageSources.length > 0) {
              pendingImageTasks.push({
                groupId: group.id,
                groupSku,
                lineNum,
                sources: imageSources.slice(0, 20),
              });
            }
          }

          // 处理规格
          // 仅当 Excel 列存在时才更新对应字段，避免空列覆盖数据库已有数据
          if (rowSpecSku) {
            const specUpdateData: Record<string, unknown> = {};
            const specCreateData: Record<string, unknown> = {
              groupId: group.id,
              sku: rowSpecSku,
            };

            // 产品规格
            if (colMap.has("产品规格")) {
              const v = String(getColValue(row, colMap, "产品规格") || "").trim() || null;
              specUpdateData.spec = v;
              specCreateData.spec = v;
            } else {
              specCreateData.spec = null;
            }

            // 拿货价格：仅当列存在且值非空时才更新
            if (colMap.has("拿货价格(元)")) {
              const raw = String(getColValue(row, colMap, "拿货价格(元)") || "").trim();
              if (raw !== "") {
                const price = parsePrice(raw, lineNum, "拿货价格");
                specUpdateData.costPrice = price;
                specCreateData.costPrice = price;
              } else {
                specUpdateData.costPrice = null;
                specCreateData.costPrice = null;
              }
            } else {
              specCreateData.costPrice = null;
            }

            // 销售价格：仅当列存在且值非空时才更新
            if (colMap.has("销售价格(元)")) {
              const raw = String(getColValue(row, colMap, "销售价格(元)") || "").trim();
              if (raw !== "") {
                const price = parsePrice(raw, lineNum, "销售价格");
                specUpdateData.salePrice = price;
                specCreateData.salePrice = price;
              } else {
                specUpdateData.salePrice = null;
                specCreateData.salePrice = null;
              }
            } else {
              specCreateData.salePrice = null;
            }

            // 适配车型
            if (colMap.has("适配车型")) {
              const v = String(getColValue(row, colMap, "适配车型") || "").trim() || null;
              specUpdateData.carModel = v;
              specCreateData.carModel = v;
            } else {
              specCreateData.carModel = null;
            }

            // OE码
            if (colMap.has("OE码")) {
              const v = String(getColValue(row, colMap, "OE码") || "").trim() || null;
              specUpdateData.oeCode = v;
              specCreateData.oeCode = v;
            } else {
              specCreateData.oeCode = null;
            }

            await tx.productSpec.upsert({
              where: {
                groupId_sku: {
                  groupId: group.id,
                  sku: rowSpecSku,
                },
              },
              update: specUpdateData as Prisma.ProductSpecUncheckedUpdateInput,
              create: specCreateData as Prisma.ProductSpecUncheckedCreateInput,
            });

            // 记录本批次处理到的规格 SKU，用于后续清理消失的规格
            if (!processedSpecSkus.has(groupSku)) {
              processedSpecSkus.set(groupSku, new Set());
            }
            processedSpecSkus.get(groupSku)!.add(rowSpecSku);

            importedSpecs++;
          }
          if (!processedGroups.has(groupSku)) {
            processedGroups.add(groupSku);
            importedGroups++;
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "未知错误";
          errors.push(`第${lineNum}行 (${String(row.产品组SKU || "?")}): ${msg}`);
        }
      }

      // === 清理消失的规格（可选，默认关闭）===
      // 危险操作：如果 Excel 只导出了部分规格，会误删数据库中的其他规格
      // 仅当显式传入 deleteMissing=true 时才执行删除
      const shouldDeleteMissing = fields.deleteMissing?.[0] === "true";
      
      if (shouldDeleteMissing) {
        for (const [groupSku, excelSpecSkus] of processedSpecSkus) {
          const group = await tx.productGroup.findFirst({
            where: { sku: groupSku, deletedAt: null },
            select: { id: true },
          });
          if (group) {
            const result = await tx.productSpec.deleteMany({
              where: {
                groupId: group.id,
                sku: { notIn: Array.from(excelSpecSkus) },
              },
            });
            deletedSpecCount += result.count;
          }
        }
      }

      // 如果有错误，回滚整个事务
      if (errors.length > 0) {
        throw new Error(`导入失败，已回滚所有操作:\n${errors.join("\n")}`);
      }

      return { importedGroups, importedSpecs, warnings };
    }, { timeout: 120000 });

    // 清理孤立图片（上次导入失败可能遗留的文件）
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      const entries = await readdir(uploadDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skuDir = path.join(uploadDir, entry.name);
          const files = await readdir(skuDir);
          for (const f of files) {
            // 检查数据库中是否还有这个产品组
            const group = await prisma.productGroup.findFirst({
              where: { sku: entry.name.replace(/_/g, "-"), deletedAt: null },
              include: { images: true },
            });
            if (!group || !group.images.some(img => img.filePath.endsWith(f))) {
              // 孤立文件，删除
              await unlink(path.join(skuDir, f)).catch(() => {});
            }
          }
          // 如果目录为空，删除目录
          const remaining = await readdir(skuDir);
          if (remaining.length === 0) {
            await rmdir(skuDir).catch(() => {});
          }
        }
      }
    } catch {
      // 清理失败不影响导入
    }

    // ========== 事务成功后：处理图片下载 ==========
    // 此时产品组/规格已入库，再进行耗时的图片下载与文件写入
    let importedImages = 0;
    const imageErrors: string[] = [];

    // 单张图片最多 8 秒，整体图片处理最多 60 秒，不阻塞数据库事务
    const overallImageDeadline = Date.now() + 60_000;

    for (const task of pendingImageTasks) {
      if (Date.now() > overallImageDeadline) {
        imageErrors.push(`图片处理超时，剩余 ${pendingImageTasks.length - pendingImageTasks.indexOf(task)} 个产品组图片未处理`);
        break;
      }

      try {
        const { groupId, groupSku, lineNum, sources } = task;
        const imageRecords: Array<{
          filePath: string;
          fileSize: number;
          sortOrder: number;
        }> = [];

        for (let j = 0; j < sources.length; j++) {
          const src = sources[j];
          try {
            let filePath: string | null = null;

            if (src.base64) {
              filePath = await saveBase64Image(src.base64, groupSku, j);
            } else if (src.url) {
              filePath = await downloadAndSaveImage(src.url, groupSku, j);
            }

            if (filePath) {
              imageRecords.push({
                filePath,
                fileSize: 0,
                sortOrder: j,
              });
              importedImages++;
            }
          } catch {
            imageErrors.push(
              `第${lineNum}行 (${groupSku}): 第${j + 1}张图片处理失败，已跳过`
            );
          }
        }

        // 删除旧图片，然后写入新图片记录
        if (imageRecords.length > 0) {
          await prisma.productImage.deleteMany({
            where: { groupId },
          });
          await prisma.productImage.createMany({
            data: imageRecords.map((r) => ({ ...r, groupId })),
          });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "未知错误";
        imageErrors.push(`产品组ID=${task.groupId}: 图片批量处理失败: ${msg}`);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        importedGroups: result.importedGroups,
        importedSpecs: result.importedSpecs,
        importedImages,
        totalRows: rows.length,
        deletedSpecs: deletedSpecCount,
        warnings: [
          ...importWarnings,
          ...result.warnings,
          ...(deletedSpecCount > 0 ? [`已删除 ${deletedSpecCount} 个Excel中不存在的规格`] : []),
          ...(imageErrors.length > 0 ? [`${imageErrors.length} 张图片处理失败`] : []),
        ],
        imageErrors: imageErrors.length > 0 ? imageErrors : undefined,
      },
    });
  } catch (e: unknown) {
    // 详细错误信息
    let msg = "服务器错误";
    let stack = "";
    if (e instanceof Error) {
      msg = e.message;
      stack = e.stack || "";
      // 打印到控制台便于调试
      console.error("[Import Error]", e.message);
      console.error(stack);
    }
    // Prisma 错误特殊处理
    if (e && typeof e === "object" && "code" in e) {
      const prismaError = e as { code: string; meta?: unknown };
      msg = `数据库错误 (${prismaError.code}): ${JSON.stringify(prismaError.meta || msg)}`;
    }
    return res.status(500).json(
      { error: `导入失败: ${msg}` }
    );
  }
}

// ========== 工具函数 ==========

function validateImportRows(rows: ExcelRowData[], colMap: Map<string, string>): string[] {
  const errors: string[] = [];
  const specLines = new Map<string, number>();
  const groupSpecCounts = new Map<string, number>();
  let prevGroupSku = "";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2;
    let groupSku = String(getColValue(row, colMap, "产品组SKU") || "").trim();
    const specSku = String(getColValue(row, colMap, "规格SKU") || "").trim()
      || String(getColValue(row, colMap, "工厂编号") || "").trim();

    if (!groupSku && specSku && prevGroupSku) {
      groupSku = prevGroupSku;
    }
    if (!groupSku) {
      continue;
    }

    prevGroupSku = groupSku;
    if (!groupSpecCounts.has(groupSku)) {
      groupSpecCounts.set(groupSku, 0);
    }

    if (!specSku) {
      continue;
    }

    groupSpecCounts.set(groupSku, (groupSpecCounts.get(groupSku) || 0) + 1);
    const key = `${groupSku}\u0000${specSku}`;
    const firstLine = specLines.get(key);
    if (firstLine) {
      errors.push(`第${lineNum}行: 产品组 "${groupSku}" 下规格SKU "${specSku}" 与第${firstLine}行重复`);
    } else {
      specLines.set(key, lineNum);
    }
  }

  for (const [groupSku, count] of groupSpecCounts) {
    if (count === 0) {
      errors.push(`产品组 "${groupSku}" 至少需要填写一条规格SKU或工厂编号`);
    }
  }

  return errors;
}

async function parseExcelRows(buffer: Buffer): Promise<ExcelRowData[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const colCount = Math.max(worksheet.columnCount, headerRow.cellCount);
  const headers: Array<string | null> = [];

  for (let col = 1; col <= colCount; col++) {
    const header = getExcelCellText(headerRow.getCell(col)).trim();
    headers[col] = header || null;
  }

  const rows: ExcelRowData[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const parsedRow: ExcelRowData = {};
    let hasData = false;

    for (let col = 1; col < headers.length; col++) {
      const header = headers[col];
      if (!header) continue;

      const value = getExcelCellText(row.getCell(col));
      parsedRow[header] = value;
      if (value.trim() !== "") {
        hasData = true;
      }
    }

    if (hasData) {
      rows.push(parsedRow);
    }
  }

  return rows;
}

function getExcelCellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return cell.text || value.toISOString();
  }

  if (typeof value !== "object") {
    return cell.text || String(value);
  }

  if ("richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text ?? "").join("");
  }

  if ("formula" in value) {
    const formula = String(value.formula ?? "");
    if (formula.trim().toUpperCase().startsWith("DISPIMG")) {
      return `=${formula}`;
    }
    if ("result" in value && value.result != null) {
      return String(value.result);
    }
    return formula ? `=${formula}` : "";
  }

  if ("text" in value && value.text != null) {
    return String(value.text);
  }

  if ("result" in value && value.result != null) {
    return String(value.result);
  }

  return cell.text || "";
}

// 从 Excel 工作簿中提取嵌入的图片
/**
 * Use exceljs to extract embedded images with their cell row positions.
 * Returns: Map<rowNumber (1-based Excel row), Array<{base64, ext}>>
 */
async function extractImagesByRow(
  buffer: Buffer
): Promise<Map<number, Array<{ base64: string; ext: string }>>> {
  const imagesByRow = new Map<number, Array<{ base64: string; ext: string }>>();
  try {
    const workbook = new ExcelJS.Workbook();
    await (workbook.xlsx as any).load(buffer);

    // First worksheet (images are anchored to cells in this sheet)
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.log("[extractImagesByRow] No worksheet found");
      return imagesByRow;
    }

    // getImages() returns Image objects from the worksheet's drawings
    const images: Array<unknown> = (worksheet as any).getImages?.() || [];
    console.log(`[extractImagesByRow] Found ${images.length} images in worksheet`);
    
    if (images.length === 0) {
      // Try alternative method: check workbook.media directly
      const mediaItems = (workbook as any).media;
      if (mediaItems && mediaItems.length > 0) {
        console.log(`[extractImagesByRow] Found ${mediaItems.length} media items in workbook, but getImages() returned 0`);
      }
      return imagesByRow;
    }

    for (const img of images) {
      try {
        const imgAny = img as any;
        if (!imgAny.range?.tl) {
          console.log("[extractImagesByRow] Image missing range.tl, skipping");
          continue;
        }

        // 使用 nativeRow 获取图片所在的行号（ExcelJS Anchor 对象的正确属性）
        // tl = top-left, br = bottom-right
        const nativeRow = imgAny.range.tl.nativeRow;
        if (typeof nativeRow !== 'number') {
          console.log(`[extractImagesByRow] Image ${imgAny.imageId} missing nativeRow, range.tl:`, JSON.stringify(imgAny.range.tl).substring(0, 200));
          continue;
        }
        
        // nativeRow 是 0-based 还是 1-based？根据实验，它是 0-based
        // 但保险起见，检查它的值：如果是 7（对应行8），说明是 0-based
        // 我们的产品组在行2和行8，如果 nativeRow=7 对应行8，则 +1 转换
        const excelRow = nativeRow + 1; // 转换为 1-based Excel 行号

        // imageId indexes into workbook.media[]
        const imageId = imgAny.imageId;
        const mediaItems = (workbook as any).media;
        if (!mediaItems || !mediaItems[imageId]) {
          console.log(`[extractImagesByRow] Media not found for imageId=${imageId}`);
          continue;
        }

        const media = mediaItems[imageId];
        const ext =
          (media.extension || "png").replace("jpeg", "jpg") || "png";

        let base64: string;
        if (media.buffer instanceof Buffer) {
          base64 = media.buffer.toString("base64");
        } else if (media.buffer) {
          base64 = Buffer.from(media.buffer).toString("base64");
        } else {
          console.log(`[extractImagesByRow] No buffer for imageId=${imageId}`);
          continue;
        }

        if (!imagesByRow.has(excelRow)) {
          imagesByRow.set(excelRow, []);
        }
        imagesByRow.get(excelRow)!.push({ base64, ext });
        console.log(`[extractImagesByRow] Image ${imageId} assigned to row ${excelRow}`);
      } catch (e) {
        console.log(`[extractImagesByRow] Error processing image: ${e}`);
        // skip individual image failures
      }
    }
    
    console.log(`[extractImagesByRow] Final imagesByRow: ${JSON.stringify(
      Array.from(imagesByRow.entries()).map(([row, imgs]) => `row ${row}: ${imgs.length} images`)
    )}`);
  } catch (e) {
    console.log(`[extractImagesByRow] ExcelJS failure: ${e}`);
    // exceljs failure shouldn't block text data import
  }
  return imagesByRow;
}

// 保存 Base64 图片到文件系统
async function saveBase64Image(
  dataUrl: string,
  sku: string,
  index: number
): Promise<string> {
  let ext = "png";
  let base64Data = dataUrl;

  const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (matches) {
    ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    base64Data = matches[2];
  }

  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.length < 4) {
    throw new Error("无效的图片数据");
  }

  const safeSku = sanitizeSkuForFilename(sku);
  const uploadDir = path.join(process.cwd(), "public", "uploads", safeSku);
  await mkdir(uploadDir, { recursive: true });

  const filename = `${safeSku}_${index + 1}.${ext}`;
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, new Uint8Array(buffer));

  return `/uploads/${safeSku}/${filename}`;
}

// 下载 URL 图片并保存到文件系统
async function downloadAndSaveImage(
  url: string,
  sku: string,
  index: number
): Promise<string | null> {
  try {
    // 协议白名单：再次验证，防止绕过
    if (!isValidImageUrl(url)) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SupplyChain/1.0",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";

    // 大小限制：检查 Content-Length，拒绝超大文件
    const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_IMAGE_DOWNLOAD_BYTES) {
      throw new Error(`图片过大 (${contentLength} bytes)，超过 ${MAX_IMAGE_DOWNLOAD_BYTES} bytes 限制`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length === 0) {
      throw new Error("下载的图片为空");
    }
    if (buffer.length > MAX_IMAGE_DOWNLOAD_BYTES) {
      throw new Error(`图片过大 (${buffer.length} bytes)，超过 ${MAX_IMAGE_DOWNLOAD_BYTES} bytes 限制`);
    }

    let ext = "png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      ext = "jpg";
    } else if (contentType.includes("gif")) {
      ext = "gif";
    } else if (contentType.includes("webp")) {
      ext = "webp";
    } else if (contentType.includes("bmp")) {
      ext = "bmp";
    }

    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      ext = "jpg";
    } else if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      ext = "png";
    } else if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46
    ) {
      ext = "gif";
    } else if (buffer[0] === 0x52 && buffer[1] === 0x49) {
      ext = "webp";
    }

    const safeSku = sanitizeSkuForFilename(sku);
    const uploadDir = path.join(process.cwd(), "public", "uploads", safeSku);
    await mkdir(uploadDir, { recursive: true });

    const filename = `${safeSku}_${index + 1}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, new Uint8Array(buffer));

    return `/uploads/${safeSku}/${filename}`;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "未知错误";
    console.error(`下载图片失败 [${url}]: ${msg}`);
    return null;
  }
}

// 导入行数据结构
interface ImportRow {
  产品组SKU?: string;
  产品名称?: string;
  供应商?: string;
  产品链接?: string;
  产品重量?: string;
  产品尺寸?: string;
  包装尺寸?: string;
  包装重量?: string;
  装箱数?: string;
  备注?: string;
  图片URL?: string;
  图片?: string;
  产品图片?: string;
  规格SKU?: string;
  工厂编号?: string;
  产品规格?: string;
  "拿货价格(元)"?: string;
  "销售价格(元)"?: string;
  适配车型?: string;
  OE码?: string;
  是否公开?: string;
}
