"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Download, Upload, Search, Columns, Trash2, Factory } from "lucide-react";
import { toast } from "sonner";
import { GROUP_COLUMNS, SPEC_COLUMNS, COLUMN_PRESETS, type ColumnName } from "@/lib/constants";
import type { SupplierListItem } from "@/lib/types";
import { deleteProducts } from "@/lib/api";

interface ToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  onSearch: () => void;
  supplierFilter: string;
  onSupplierFilterChange: (v: string) => void;
  suppliers: SupplierListItem[];
  onSuppliersChanged: () => void;
  selectedCols: ColumnName[];
  onToggleCol: (col: ColumnName) => void;
  onApplyPreset: (name: string) => void;
  colSelectorOpen: boolean;
  onToggleColSelector: () => void;
  role: string;
  onNewProduct: () => void;
  onExport: () => void;
  onImportSuccess: () => void;
  selectedProductIds: number[];
  onBulkDeleteSuccess: () => void;
  editMode?: boolean;
  onToggleEditMode?: () => void;
}

export function Toolbar({
  search,
  onSearchChange,
  onSearch,
  supplierFilter,
  onSupplierFilterChange,
  suppliers,
  selectedCols,
  onToggleCol,
  onApplyPreset,
  colSelectorOpen,
  onToggleColSelector,
  role,
  onNewProduct,
  onExport,
  onImportSuccess,
  selectedProductIds,
  onBulkDeleteSuccess,
  editMode = false,
  onToggleEditMode,
}: ToolbarProps) {
  const [importing, setImporting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [supplierSelectorOpen, setSupplierSelectorOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSupplier = suppliers.find((s) => String(s.id) === supplierFilter);
  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearch.trim().toLowerCase())
  );

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      toast.error("请上传 Excel 文件（.xlsx 或 .xls）");
      e.target.value = "";
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      toast.error("文件过大，请上传小于 200MB 的 Excel 文件");
      e.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || result?.error) {
        const errorMsg = String(result?.error || `导入失败: HTTP ${res.status}`);
        toast.error(errorMsg.length > 100 ? "导入失败" : errorMsg, {
          description: errorMsg.length > 100 ? errorMsg : undefined,
          duration: 8000,
        });
        return;
      }

      const data = result?.data as
        | {
            importedGroups?: number;
            importedSpecs?: number;
            importedImages?: number;
            imageErrors?: string[];
          }
        | undefined;

      toast.success(
        `导入成功：产品组 ${data?.importedGroups || 0}，规格 ${data?.importedSpecs || 0}，图片 ${data?.importedImages || 0}`
      );

      if (data?.imageErrors?.length) {
        toast.warning(`${data.imageErrors.length} 张图片处理失败`, {
          description: data.imageErrors.slice(0, 3).join("\n"),
          duration: 6000,
        });
      }

      onImportSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "文件导入失败");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmBulkDelete() {
    setBulkDeleting(true);
    try {
      const result = await deleteProducts(selectedProductIds);
      toast.success(`已删除 ${result.count} 个产品`);
      setBulkDeleteOpen(false);
      onBulkDeleteSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-[320px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <Input
          className="pl-8 h-8 text-sm bg-white border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20"
          placeholder="搜索产品名称 / SKU / 车型，按回车搜索"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
        />
      </div>

      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSupplierSelectorOpen(!supplierSelectorOpen)}
          className={`border-gray-200 h-8 px-3 ${supplierFilter ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Factory className="w-3.5 h-3.5 mr-1" />
          {selectedSupplier?.name || "全部供应商"}
          {supplierFilter && (
            <span
              className="ml-1.5 w-4 h-4 rounded-full bg-emerald-200 hover:bg-emerald-300 flex items-center justify-center text-[10px] font-bold text-emerald-700 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSupplierFilterChange("");
              }}
            >
              x
            </span>
          )}
        </Button>

        {supplierSelectorOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSupplierSelectorOpen(false)} />
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-[240px] max-h-[300px] overflow-y-auto smooth-appear">
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="搜索供应商..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                  !supplierFilter ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-600"
                }`}
                onClick={() => {
                  onSupplierFilterChange("");
                  setSupplierSelectorOpen(false);
                }}
              >
                <span>全部供应商</span>
                <span className="text-xs text-gray-400">{suppliers.length}</span>
              </button>
              {filteredSuppliers.map((s) => (
                <button
                  key={s.id}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                    supplierFilter === String(s.id) ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-600"
                  }`}
                  onClick={() => {
                    onSupplierFilterChange(String(s.id));
                    setSupplierSelectorOpen(false);
                  }}
                >
                  <span className="truncate mr-2">{s.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{s.productCount ?? 0}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="relative">
        <Button variant="outline" size="sm" onClick={onToggleColSelector} className="border-gray-200 text-gray-600 hover:bg-gray-50">
          <Columns className="w-3.5 h-3.5 mr-1" /> 显示列
        </Button>
        {colSelectorOpen && (
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-50 w-[280px] max-h-[400px] overflow-y-auto smooth-appear">
            <div className="flex gap-1 flex-wrap mb-2">
              {Object.keys(COLUMN_PRESETS).map((name) => (
                <Button key={name} variant="outline" size="sm" className="text-xs h-6 border-gray-200 text-gray-600 hover:border-emerald-300" onClick={() => onApplyPreset(name)}>
                  {name}
                </Button>
              ))}
            </div>
            <div className="text-xs font-medium text-emerald-700 mb-1">产品组信息</div>
            {GROUP_COLUMNS.map((col) => {
              if (role === "viewer" && ["供应商", "产品链接", "备注"].includes(col)) return null;
              return (
                <label key={col} className="flex items-center gap-1.5 py-0.5 text-xs cursor-pointer hover:bg-emerald-50/50 rounded px-1">
                  <Checkbox checked={selectedCols.includes(col)} onCheckedChange={() => onToggleCol(col)} className="h-3 w-3" />
                  {col}
                </label>
              );
            })}
            <div className="text-xs font-medium text-emerald-700 mb-1 mt-2">规格信息</div>
            {SPEC_COLUMNS.map((col) => {
              if (role === "viewer" && col === "拿货价格(元)") return null;
              return (
                <label key={col} className="flex items-center gap-1.5 py-0.5 text-xs cursor-pointer hover:bg-emerald-50/50 rounded px-1">
                  <Checkbox checked={selectedCols.includes(col)} onCheckedChange={() => onToggleCol(col)} className="h-3 w-3" />
                  {col}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {role !== "viewer" && (
        <>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 premium-btn" onClick={onNewProduct}>
            <Plus className="w-3.5 h-3.5 mr-1" /> 新增商品
          </Button>
          <Button variant="outline" size="sm" disabled={importing} onClick={() => fileInputRef.current?.click()} className="border-gray-200 text-gray-600 hover:bg-gray-50 premium-btn">
            <Upload className="w-3.5 h-3.5 mr-1" />
            {importing ? "导入中..." : "导入 Excel"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const a = document.createElement("a");
              a.href = "/导入模板.xlsx";
              a.download = "导入模板.xlsx";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            className="border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> 下载模板
          </Button>
          <Button variant="outline" size="sm" onClick={onExport} className="border-gray-200 text-gray-600 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5 mr-1" /> 导出 Excel
          </Button>

          <Button
            size="sm"
            variant={editMode ? "default" : "outline"}
            onClick={onToggleEditMode}
            className={editMode ? "bg-amber-500 hover:bg-amber-600 text-white" : "border-amber-300 text-amber-700 hover:bg-amber-50"}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {editMode ? "退出编辑" : "编辑模式"}
          </Button>

          {editMode && (
            <Button
              size="sm"
              variant={selectedProductIds.length > 0 ? "destructive" : "outline"}
              onClick={() => {
                if (selectedProductIds.length === 0) {
                  toast.warning("请先勾选要删除的产品");
                  return;
                }
                setBulkDeleteOpen(true);
              }}
              disabled={selectedProductIds.length === 0 || bulkDeleting}
              className={selectedProductIds.length > 0 ? "bg-red-600 hover:bg-red-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              {bulkDeleting ? "删除中..." : selectedProductIds.length > 0 ? `删除选中(${selectedProductIds.length})` : "批量删除"}
            </Button>
          )}

          <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>确认批量删除</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  确定要删除选中的 <b className="text-red-600">{selectedProductIds.length}</b> 个产品吗？
                </p>
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                  此操作不可撤销，将同时删除所有关联的规格和图片数据。
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}>
                    取消
                  </Button>
                  <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmBulkDelete} disabled={bulkDeleting}>
                    {bulkDeleting ? "删除中..." : "确定删除"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
