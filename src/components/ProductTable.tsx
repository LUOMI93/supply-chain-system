"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { COLUMN_WIDTHS, isGroupCol, isSpecCol, type ColumnName } from "@/lib/constants";
import { renderTableCell } from "@/lib/table-utils";
import type { ProductListItem } from "@/lib/types";

interface ProductTableProps {
  products: ProductListItem[];
  selectedCols: ColumnName[];
  role: string;
  selectedProductIds?: number[];
  onToggleProductSelection?: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (product: ProductListItem) => void;
  onOpenLightbox: (product: ProductListItem) => void;
  editMode?: boolean;
}

export function ProductTable({
  products,
  selectedCols,
  role,
  selectedProductIds = [],
  onToggleProductSelection,
  onEdit,
  onDelete,
  onOpenLightbox,
  editMode = false,
}: ProductTableProps) {
  const [expandedProductIds, setExpandedProductIds] = useState<Set<number>>(new Set());
  const displayCols = selectedCols.filter(
    (c) => !["产品组SKU", "产品图片"].includes(c) &&
    !(role === "viewer" && ["供应商", "产品链接", "拿货价格(元)", "备注"].includes(c))
  );

  const hasSelectionSupport = role !== "viewer" && editMode && !!onToggleProductSelection;
  const collapsedSpecLimit = 3;

  function toggleExpandedProduct(id: number) {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="h-full min-h-0 overflow-auto border border-[#b9c6b7] rounded">
      <table className="w-full border-collapse text-sm min-w-[1300px]">
        <thead>
          <tr className="bg-[#dfeadf]">
            {hasSelectionSupport && (
              <th
                className="sticky left-0 top-0 z-[18] bg-[#dfeadf] px-2 py-2 text-center font-bold text-sm whitespace-nowrap border-b-2 border-[#244b35]"
                style={{ minWidth: "40px", width: "40px" }}
              >
                <Checkbox
                  checked={
                    products.length > 0 &&
                    products.every((p) => selectedProductIds.includes(p.id))
                  }
                  onCheckedChange={() => {
                    const allSelected = products.every((p) =>
                      selectedProductIds.includes(p.id)
                    );
                    if (allSelected) {
                      products.forEach((p) => onToggleProductSelection?.(p.id));
                    } else {
                      products.forEach((p) => {
                        if (!selectedProductIds.includes(p.id)) {
                          onToggleProductSelection?.(p.id);
                        }
                      });
                    }
                  }}
                  className="mx-auto"
                  title="全选/取消全选当前页"
                />
              </th>
            )}
            <th
              className={`sticky top-0 z-[18] bg-[#dfeadf] px-2 py-2 text-left font-bold text-sm whitespace-nowrap border-b-2 border-[#244b35] ${hasSelectionSupport ? "left-[40px]" : "left-0"}`}
              style={{ minWidth: "120px", width: "120px" }}
            >
              产品组SKU
            </th>
            <th
              className={`sticky top-0 z-[18] bg-[#dfeadf] px-2 py-2 text-center font-bold text-sm whitespace-nowrap border-b-2 border-[#244b35] ${hasSelectionSupport ? "left-[160px]" : "left-[120px]"}`}
              style={{ minWidth: "78px", width: "78px" }}
            >
              图片
            </th>
            {displayCols.map((col) => (
              <th
                key={col}
                className="sticky top-0 z-[12] bg-[#dfeadf] px-2 py-2 text-left font-bold text-sm whitespace-nowrap border-b-2 border-[#244b35]"
                style={
                  COLUMN_WIDTHS[col]
                    ? {
                        minWidth: COLUMN_WIDTHS[col],
                        maxWidth: COLUMN_WIDTHS[col],
                        width: COLUMN_WIDTHS[col],
                      }
                    : {}
                }
              >
                {col}
              </th>
            ))}
            {role !== "viewer" && (
              <th
                className="sticky top-0 z-[12] bg-[#dfeadf] px-2 py-2 text-center font-bold text-sm whitespace-nowrap border-b-2 border-[#244b35]"
                style={{ minWidth: "50px", width: "50px" }}
              >
                操作
              </th>
            )}
          </tr>
        </thead>
        <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={displayCols.length + 3 + (hasSelectionSupport ? 1 : 0) + (role !== "viewer" ? 1 : 0)}
                  className="py-20 text-center text-[#637066]"
                >
                  暂无产品数据
                </td>
              </tr>
            ) : (
              products.map((product, gi) => {
                const allSpecs = product.specs?.length
                  ? product.specs
                  : [null as unknown as ProductListItem["specs"][number]];
                const totalSpecs = allSpecs.length;
                const isExpanded = expandedProductIds.has(product.id);
                const specs =
                  totalSpecs > collapsedSpecLimit && !isExpanded
                    ? allSpecs.slice(0, collapsedSpecLimit)
                    : allSpecs;
                const N = specs.length;
                return specs.map((spec, si) => {
                  const isFirst = si === 0;
                  const isLast = si === N - 1;
                  const rowClass = `${gi % 2 === 1 ? "bg-[#f7faf4]" : "bg-white"} hover:bg-[#fafdf8]`;
                  const isSelected = selectedProductIds.includes(product.id);

                  return (
                    <tr
                      key={`${product.id}-${spec?.id ?? si}`}
                      className={`${rowClass} ${isSelected ? "!bg-emerald-50/70" : ""}`}
                    >
                      {hasSelectionSupport && isFirst && (
                        <td
                          rowSpan={N}
                          className={`sticky z-[4] px-2 py-1 align-middle text-center border-b border-[#e8ede5] ${
                            isSelected ? "bg-emerald-50/70" : rowClass
                          } ${hasSelectionSupport ? "left-0" : ""} !bg-[inherit]`}
                          style={{ minWidth: "40px", width: "40px" }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleProductSelection?.(product.id)}
                            className="mx-auto"
                          />
                        </td>
                      )}
                      {isFirst && (
                        <td
                          rowSpan={N}
                          className={`sticky z-[4] px-2 py-1 align-middle border-b border-[#e8ede5] ${
                            isSelected ? "bg-emerald-50/70" : rowClass
                          } ${hasSelectionSupport ? "left-[40px]" : "left-0"} !bg-[inherit]`}
                          style={{ minWidth: "120px", width: "120px" }}
                        >
                          <div className="space-y-1">
                            <span className="block text-[#244b35] font-semibold text-sm">
                              {product.sku}
                            </span>
                            {totalSpecs > collapsedSpecLimit && (
                              <button
                                type="button"
                                onClick={() => toggleExpandedProduct(product.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-teal-100 bg-teal-50 px-1.5 py-0.5 text-[11px] font-medium text-teal-700 hover:bg-teal-100"
                                title={isExpanded ? "收起规格" : "展开全部规格"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                                {isExpanded ? "收起" : `共 ${totalSpecs} 个规格`}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      {isFirst && (
                        <td
                          rowSpan={N}
                          className={`sticky z-[4] px-2 py-1 align-middle text-center border-b border-[#e8ede5] ${
                            isSelected ? "bg-emerald-50/70" : rowClass
                          } ${hasSelectionSupport ? "left-[160px]" : "left-[120px]"} !bg-[inherit]`}
                          style={{ minWidth: "78px", width: "78px" }}
                        >
                          {product.images?.length > 0 && product.images[0]?.filePath ? (
                            <div
                              className="w-[72px] h-[56px] mx-auto rounded overflow-hidden cursor-pointer bg-[#dfeadf] relative"
                              onClick={() => onOpenLightbox(product)}
                            >
                              <img
                                src={product.images[0].filePath}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {product.images.length > 1 && (
                                <span className="absolute bottom-0 right-0 bg-[#244b35] text-white text-[10px] px-1 rounded">
                                  {product.images.length}张
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#637066] text-xs">无图</span>
                          )}
                        </td>
                      )}

                      {displayCols.map((col) => {
                        if (isGroupCol(col)) {
                          if (!isFirst) return null;
                          const val = renderTableCell(product, null, col, role);
                          return (
                            <td
                              key={col}
                              rowSpan={N}
                              className={`px-2 py-1 align-middle border-b border-[#e8ede5] overflow-hidden text-ellipsis whitespace-nowrap ${
                                isSelected ? "bg-emerald-50/70" : ""
                              }`}
                              style={
                                COLUMN_WIDTHS[col] ? { maxWidth: COLUMN_WIDTHS[col] } : {}
                              }
                              title={typeof val === "string" && val.length > 15 ? val : undefined}
                            >
                              {val}
                            </td>
                          );
                        }
                        if (isSpecCol(col)) {
                          const cellVal = spec?.[col.toLowerCase().replace(/[()（）]/g, "").replace(/(元)/g, "") as keyof typeof spec] ?? "-";
                          const displayVal = renderTableCell(product, spec, col, role);
                          return (
                            <td
                              key={col}
                              className={`px-2 py-1 align-middle border-b ${
                                isLast ? "border-[#d0d8cc]" : "border-[#e8ede5]"
                              } text-sm ${isSelected ? "bg-emerald-50/70" : ""}`}
                              style={
                                COLUMN_WIDTHS[col] ? { maxWidth: COLUMN_WIDTHS[col] } : {}
                              }
                              title={typeof cellVal === "string" && cellVal !== "-" && String(cellVal).length > 15 ? cellVal : undefined}
                            >
                              {displayVal}
                            </td>
                          );
                        }
                        return null;
                      })}

                      {isFirst && (
                        <td
                          rowSpan={N}
                          className={`px-1 py-1 align-middle text-center border-b border-[#e8ede5] whitespace-nowrap ${
                            isSelected ? "bg-emerald-50/70" : ""
                          }`}
                          style={{ minWidth: "50px", width: "50px" }}
                        >
                          {role !== "viewer" && (
                            <div className="flex gap-1 justify-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all shadow-sm"
                                onClick={() => onEdit(product.id)}
                                title="编辑"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shadow-sm"
                                onClick={() => onDelete(product)}
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                });
              })
            )}
          </tbody>
      </table>
    </div>
  );
}
