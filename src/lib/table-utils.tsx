// 表格渲染工具函数 — 类型安全的列值访问

import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import type { ColumnName } from "@/lib/constants";
import type { ProductListItem } from "@/lib/types";

/**
 * 根据列名获取产品组层的值（类型安全）
 */
export function getGroupCellValue(
  product: ProductListItem,
  col: ColumnName
): string | null {
  switch (col) {
    case "产品名称":
      return product.name;
    case "供应商":
      return product.supplier?.name ?? null; // API 层已将 viewer 的 supplier 设为 null
    case "产品链接":
      return product.productLink;
    case "产品重量":
      return product.productWeight;
    case "产品尺寸":
      return product.productSize;
    case "包装尺寸":
      return product.packageSize;
    case "包装重量":
      return product.packageWeight;
    case "装箱数":
      return product.boxQuantity;
    case "备注":
      return product.remark;
    default:
      return null;
  }
}

/**
 * 根据列名获取规格层的值（类型安全）
 */
export function getSpecCellValue(
  spec: ProductListItem["specs"][number],
  col: ColumnName
): string | number | null {
  switch (col) {
    case "规格SKU":
      return spec.sku;
    case "产品规格":
      return spec.spec;
    case "拿货价格(元)":
      return spec.costPrice;
    case "销售价格(元)":
      return spec.salePrice;
    case "适配车型":
      return spec.carModel;
    case "OE码":
      return spec.oeCode;
    default:
      return null;
  }
}

/**
 * 渲染表格单元格（类型安全）
 * @param role 用户角色，viewer 隐藏敏感信息（拿货价格、产品链接）
 */
export function renderTableCell(
  product: ProductListItem,
  spec: ProductListItem["specs"][number] | null,
  col: ColumnName,
  role?: string
): React.ReactNode {
  const isViewer = role === "viewer";

  // 产品组列
  const groupVal = getGroupCellValue(product, col);
  if (groupVal !== null) {
    // viewer 看不到供应商
    if (col === "供应商" && isViewer) {
      return <span className="text-[#637066]">-</span>;
    }
    // viewer 看不到备注
    if (col === "备注" && isViewer) {
      return <span className="text-[#637066]">-</span>;
    }
    // viewer 看不到产品链接
    if (col === "产品链接") {
      if (isViewer) return <span className="text-[#637066]">-</span>;
      if (groupVal) {
        return (
          <span className="inline-flex items-center gap-1.5">
            <a
              href={groupVal}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              打开
            </a>
            <button
              className="inline-flex items-center justify-center w-7 h-7 text-[11px] font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-md border border-teal-200 transition-colors"
              title="复制链接"
              onClick={() => {
                navigator.clipboard
                  .writeText(groupVal)
                  .then(() => toast.success("链接已复制"))
                  .catch(() => toast.error("复制失败"));
              }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </span>
        );
      }
      return <span className="text-[#637066]">-</span>;
    }
    if (col === "产品名称") {
      return (
        <span className="block max-w-[140px] truncate" title={groupVal}>
          {groupVal ? groupVal : "-"}
        </span>
      );
    }
    return (
      <span>
        {groupVal ? (
          groupVal
        ) : (
          <span className="text-[#637066]">-</span>
        )}
      </span>
    );
  }

  // 规格列
  if (spec) {
    const specVal = getSpecCellValue(spec, col);
    if (specVal !== null) {
      // viewer 看不到拿货价格
      if (col === "拿货价格(元)") {
        if (isViewer) return <span className="text-[#637066]">-</span>;
        return (
          <span className="text-[#8b4513] text-sm whitespace-nowrap">
            {formatPrice(specVal as string | null)}
          </span>
        );
      }
      if (col === "销售价格(元)") {
        return (
          <span className="text-[#8b4513] text-sm whitespace-nowrap">
            {formatPrice(specVal as string | null)}
          </span>
        );
      }
      if (col === "规格SKU") {
        return (
          <span className="text-[#244b35] font-medium text-sm">
            {specVal !== null && specVal !== undefined ? String(specVal) : "-"}
          </span>
        );
      }
      return (
        <span className="text-[#637066] text-sm">
          {specVal !== null && specVal !== undefined ? String(specVal) : "-"}
        </span>
      );
    }
  }

  return null;
}
