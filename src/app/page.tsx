"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Upload, LogOut, Package, Factory, Layers, ImageIcon, TrendingUp, Clock, FileText, ChevronRight, Search, Users } from "lucide-react";
import { DEFAULT_COLUMNS, COLUMN_PRESETS, type ColumnName } from "@/lib/constants";
import { Toolbar } from "@/components/Toolbar";
import { ProductTable } from "@/components/ProductTable";
import { Pagination } from "@/components/Pagination";
import { DeleteProductDialog } from "@/components/DeleteDialog";
import { Lightbox } from "@/components/Lightbox";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import type { ProductListItem, SupplierListItem } from "@/lib/types";
import { fetchProducts, fetchSuppliers, deleteProduct, exportProducts, fetchDashboardStats } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role || "viewer";

  const urlParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(parseInt(urlParams.get("page") || "1"));
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState(urlParams.get("search") || "");
  const [supplierFilter, setSupplierFilter] = useState(
    urlParams.get("supplierId") || ""
  );
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCols, setSelectedCols] = useState<ColumnName[]>([
    ...DEFAULT_COLUMNS,
  ]);
  const [colSelectorOpen, setColSelectorOpen] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);

  // 批量删除选中状态
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  // 编辑模式开关：只有点击"编辑模式"按钮后才显示勾选框
  const [editMode, setEditMode] = useState(false);

  // 导出对话框：选择要导出的供应商
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedExportSupplierIds, setSelectedExportSupplierIds] = useState<number[]>([]);
  const [exportSupplierSearch, setExportSupplierSearch] = useState("");

  function toggleProductSelection(id: number) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function clearProductSelection() {
    setSelectedProductIds([]);
  }

  function exitEditMode() {
    setEditMode(false);
    clearProductSelection();
  }

  // 当产品数据变化（翻页/搜索/删除后），同步选中状态
  useEffect(() => {
    const productIds = new Set(products.map((p) => p.id));
    setSelectedProductIds((prev) => prev.filter((id) => productIds.has(id)));
  }, [products]);

  useEffect(() => {
    fetchDashboardStats()
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const loadProducts = useCallback(async (override?: {
    page?: number;
    search?: string;
    supplierFilter?: string;
  }) => {
    const nextPage = override?.page ?? page;
    const nextSearch = override?.search ?? search;
    const nextSupplierFilter = override?.supplierFilter ?? supplierFilter;

    setLoading(true);
    try {
      const result = await fetchProducts({
        page: nextPage,
        pageSize: 50,
        search: nextSearch || undefined,
        supplierId: nextSupplierFilter || undefined,
      });
      setProducts(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 0);
    } catch (err) {
      toast.error("加载产品列表失败");
    } finally {
      setLoading(false);
    }
  }, [page, search, supplierFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    fetchSuppliers()
      .then((d) => setSuppliers(d.data || []))
      .catch(() => {});
  }, []);

  function handleSearch() {
    setPage(1);
    loadProducts({ page: 1, search });
  }

  function handleClearSearch() {
    setSearch("");
    setPage(1);
    loadProducts({ page: 1, search: "" });
  }

  function handleSupplierChange(v: string) {
    setSupplierFilter(v || "");
    setPage(1);
  }

  function toggleCol(col: ColumnName) {
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  function applyPreset(name: string) {
    const preset = COLUMN_PRESETS[name];
    if (preset) setSelectedCols([...preset] as ColumnName[]);
  }

  function openLightbox(product: ProductListItem) {
    const imgs = product.images?.map((i) => i.filePath).filter(Boolean) || [];
    if (imgs.length) setLightboxImages(imgs as string[]);
  }

  // 刷新所有相关数据（删除/导入后调用）
  const refreshAllData = useCallback(async () => {
    const [statsResult, suppliersResult] = await Promise.all([
      fetchDashboardStats().catch(() => null),
      fetchSuppliers().catch(() => null),
    ]);
    if (statsResult) setStats(statsResult);
    if (suppliersResult?.data) setSuppliers(suppliersResult.data);
  }, []);

  async function handleDelete(id: number) {
    try {
      await deleteProduct(id);
      toast.success("已删除");
      setDeleteTarget(null);
      // 删除后刷新产品列表 + 统计数据 + 供应商数据
      await Promise.all([
        loadProducts(),
        refreshAllData(),
      ]);
    } catch {
      toast.error("删除失败");
    }
  }

  function handleExport() {
    if (role === "viewer") {
      toast.error("当前账号无导出权限");
      return;
    }

    // 如果当前已选了供应商筛选，则直接导出该供应商
    if (supplierFilter) {
      toast.promise(
        exportProducts({
          search: search || undefined,
          supplierId: supplierFilter,
        }),
        {
          loading: "正在生成导出文件...",
          success: "导出成功！",
          error: (err) => (err instanceof Error ? err.message : "导出失败"),
        }
      );
      return;
    }
    // 否则打开供应商选择对话框
    setSelectedExportSupplierIds([]);
    setExportSupplierSearch("");
    setExportDialogOpen(true);
  }

  function confirmExport() {
    if (role === "viewer") {
      toast.error("当前账号无导出权限");
      return;
    }

    if (selectedExportSupplierIds.length === 0) {
      toast.error("请至少选择一个供应商");
      return;
    }
    toast.promise(
      exportProducts({
        search: search || undefined,
        supplierIds: selectedExportSupplierIds.join(","),
      }),
      {
        loading: "正在生成导出文件...",
        success: "导出成功！",
        error: (err) => (err instanceof Error ? err.message : "导出失败"),
      }
    );
    setExportDialogOpen(false);
  }

  function toggleExportSupplier(id: number) {
    setSelectedExportSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllSuppliersForExport() {
    const visibleIds = filteredExportSuppliers.map((s) => s.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) =>
      selectedExportSupplierIds.includes(id)
    );

    if (allVisibleSelected) {
      setSelectedExportSupplierIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedExportSupplierIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  }

  function handleLogout() {
    signOut({ redirectTo: `${window.location.origin}/login` });
  }

  const statCards = stats
    ? role === "viewer"
      ? [
          {
            icon: <Package className="w-5 h-5" />,
            label: "可浏览产品",
            value: stats.totalGroups,
            color: "text-teal-600",
            bgColor: "bg-teal-50",
            borderColor: "border-teal-100",
          },
          {
            icon: <Layers className="w-5 h-5" />,
            label: "产品规格",
            value: stats.totalSpecs,
            color: "text-green-600",
            bgColor: "bg-green-50",
            borderColor: "border-green-100",
          },
          {
            icon: <ImageIcon className="w-5 h-5" />,
            label: "产品图片",
            value: stats.totalImages,
            color: "text-cyan-600",
            bgColor: "bg-cyan-50",
            borderColor: "border-cyan-100",
          },
        ]
      : [
          {
            icon: <Package className="w-5 h-5" />,
            label: "产品组",
            value: stats.totalGroups,
            color: "text-teal-600",
            bgColor: "bg-teal-50",
            borderColor: "border-teal-100",
          },
          {
            icon: <Factory className="w-5 h-5" />,
            label: "供应商",
            value: stats.totalSuppliers,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
            borderColor: "border-emerald-100",
          },
          {
            icon: <Layers className="w-5 h-5" />,
            label: "规格总数",
            value: stats.totalSpecs,
            color: "text-green-600",
            bgColor: "bg-green-50",
            borderColor: "border-green-100",
          },
          {
            icon: <ImageIcon className="w-5 h-5" />,
            label: "图片总数",
            value: stats.totalImages,
            color: "text-cyan-600",
            bgColor: "bg-cyan-50",
            borderColor: "border-cyan-100",
          },
          {
            icon: <TrendingUp className="w-5 h-5" />,
            label: "近7天新增",
            value: stats.recentGroupsCount,
            color: "text-teal-700",
            bgColor: "bg-teal-50/80",
            borderColor: "border-teal-100",
          },
        ]
    : [];
  const filteredExportSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(exportSupplierSearch.trim().toLowerCase())
  );
  const allFilteredExportSuppliersSelected =
    filteredExportSuppliers.length > 0 &&
    filteredExportSuppliers.every((s) => selectedExportSupplierIds.includes(s.id));

  return (
    <div className="h-screen overflow-hidden bg-[#f6f8f4] flex flex-col">
      {/* Top bar - Premium Header */}
      <div className="shrink-0 z-20 bg-white/85 backdrop-blur-xl border-b border-gray-100/80 shadow-sm">
        <div className="px-6 py-4">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center shadow-md shadow-teal-500/20">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-[17px] font-bold text-gray-800 leading-tight tracking-tight">
                  {role === "viewer" ? "产品目录" : "供应链产品管理系统"}
                </h1>
                <p className="text-[12px] text-gray-400 leading-tight mt-0.5">
                  {role === "viewer"
                    ? "浏览可见产品、规格与适配车型"
                    : "Supply Chain Product Management Platform"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* User Avatar */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-[11px] font-medium">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="text-[12px] text-gray-600 font-medium">
                  {session?.user?.name}
                  {role === "viewer" && <span className="ml-1 text-gray-400">浏览</span>}
                </span>
              </div>

              {/* Nav Buttons */}
              {role !== "viewer" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/suppliers")}
                  className="text-[12px] text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg h-9 px-3 gap-1.5"
                >
                  <Factory className="w-4 h-4" />
                  供应商
                </Button>
              )}

              {role === "admin" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/users")}
                  className="text-[12px] text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg h-9 px-3 gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  用户
                </Button>
              )}

              {role === "admin" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/audit-logs")}
                  className="text-[12px] text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg h-9 px-3 gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  日志
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg h-9 px-3 gap-1.5"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats Cards - Elegant Metric Display */}
          {!statsLoading && stats && (
            <div className={`grid gap-3 mb-5 ${
              role === "viewer"
                ? "grid-cols-1 sm:grid-cols-3"
                : "grid-cols-2 md:grid-cols-3 xl:grid-cols-7"
            }`}>
              {statCards.map((card, i) => (
                <div
                  key={i}
                  className={`group relative bg-white rounded-xl border border-gray-100 p-3 transition-all duration-300 hover:shadow-md hover:border-teal-100 hover:-translate-y-0.5 smooth-appear ${
                    role === "viewer" ? "min-h-[88px]" : "min-h-[116px]"
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Subtle gradient bg */}
                  <div className={`absolute inset-0 ${card.bgColor} opacity-0 group-hover:opacity-50 rounded-xl transition-opacity duration-300`} />

                  <div className="relative">
                    <div className={role === "viewer" ? "flex items-center gap-3" : ""}>
                      <div className={`w-8 h-8 rounded-lg ${card.bgColor} ${card.color} ${card.borderColor} border flex items-center justify-center ${role === "viewer" ? "shrink-0" : "mb-2"} transition-all duration-300 group-hover:scale-110 group-hover:shadow-sm`}>
                        {card.icon}
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 font-medium mb-1 uppercase tracking-wider">{card.label}</p>
                        <p className={`text-xl font-bold text-gray-800 tracking-tight leading-none`}>{card.value}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {role === "admin" && (
                <div className="col-span-2 md:col-span-3 xl:col-span-2 bg-white rounded-xl border border-gray-100 p-3 min-h-[116px] shadow-sm smooth-appear">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-cyan-50 rounded-lg border border-cyan-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="text-[13px] font-semibold text-gray-700 leading-tight">最近操作</h3>
                        <p className="text-[10px] text-gray-400 leading-tight">Recent Activity</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/audit-logs")}
                      className="h-7 px-2 text-[11px] text-gray-500 hover:text-teal-700 hover:bg-teal-50"
                    >
                      查看
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {stats.recentActivity.length > 0 ? stats.recentActivity.slice(0, 3).map((log) => (
                      <div key={log.id} className="grid grid-cols-[54px_58px_1fr] items-center gap-2 text-[11px] leading-5">
                        <span className="text-gray-400 font-mono whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("zh-CN", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className={"px-1.5 py-0.5 rounded-md text-[10px] font-medium text-center border truncate " + (
                          log.action === "create" ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" :
                          log.action === "update" ? "bg-blue-50 text-blue-600 border-blue-100/50" :
                          log.action === "delete" ? "bg-red-50 text-red-600 border-red-100/50" :
                          "bg-gray-50 text-gray-600 border-gray-100/50"
                        )}>
                          {log.action === "create" ? "创建" : log.action === "update" ? "更新" : log.action === "delete" ? "删除" : log.action}
                        </span>
                        <span className="text-gray-500 truncate">{log.detail || `${log.entityType}#${log.entityId}`}</span>
                      </div>
                    )) : (
                      <div className="py-3 text-center text-gray-400 text-[12px]">暂无操作记录</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Toolbar - Refined Search & Actions */}
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
            supplierFilter={supplierFilter}
            onSupplierFilterChange={handleSupplierChange}
            suppliers={suppliers}
            onSuppliersChanged={() => fetchSuppliers().then((d) => setSuppliers(d.data || []))}
            selectedCols={selectedCols}
            onToggleCol={toggleCol}
            onApplyPreset={applyPreset}
            colSelectorOpen={colSelectorOpen}
            onToggleColSelector={() => setColSelectorOpen(!colSelectorOpen)}
            role={role}
            onNewProduct={() => router.push("/products/new")}
            onExport={handleExport}
            onImportSuccess={() => {
              clearProductSelection();
              loadProducts();
              refreshAllData();
            }}
            selectedProductIds={selectedProductIds}
            onBulkDeleteSuccess={() => {
              exitEditMode();
              loadProducts();
              refreshAllData();
            }}
            editMode={editMode}
            onToggleEditMode={() => {
              if (editMode) {
                exitEditMode();
              } else {
                setEditMode(true);
              }
            }}
          />
        </div>
      </div>

      {/* Content - Refined Table */}
      <div className="px-6 pb-5 pt-3 flex-1 min-h-0 overflow-hidden flex flex-col">
        {loading ? (
          <div className="premium-table-wrapper mt-2 flex-1 min-h-0 overflow-hidden">
            <TableSkeleton rows={6} />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 min-h-0">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-teal-50/30 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-gray-100/80">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 text-[14px] mb-2">还没有产品数据</p>
            <p className="text-gray-400 text-[12px] mb-6">开始创建您的第一个产品或从 Excel 导入数据</p>
            {role !== "viewer" && (
              <div className="flex gap-3 justify-center">
                <Button
                  className="bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-xl h-10 px-5 shadow-md shadow-teal-600/20 transition-all hover:shadow-lg hover:shadow-teal-600/25"
                  onClick={() => router.push("/products/new")}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> 新增产品
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const fileInput = document.querySelector<HTMLInputElement>(
                      'input[type="file"][accept=".xlsx,.xls"]'
                    );
                    fileInput?.click();
                  }}
                  className="h-10 px-5 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                >
                  <Upload className="w-4 h-4 mr-1.5" /> 导入Excel
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="premium-table-wrapper smooth-appear flex-1 min-h-0 flex flex-col overflow-hidden">
            <ProductTable
              products={products}
              selectedCols={selectedCols}
              role={role}
              selectedProductIds={selectedProductIds}
              onToggleProductSelection={toggleProductSelection}
              onEdit={(id) => router.push(`/products/${id}/edit`)}
              onDelete={setDeleteTarget}
              onOpenLightbox={openLightbox}
              editMode={editMode}
            />
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/30 flex shrink-0 items-center justify-between">
              <div className="text-[12px] text-gray-500">
                显示 <span className="text-gray-700 font-medium">{products.length}</span> 条记录，共 <span className="text-gray-700 font-medium">{total}</span> 条
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </div>

      <DeleteProductDialog
        open={deleteTarget !== null}
        product={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {/* 导出供应商选择对话框 */}
      {exportDialogOpen && role !== "viewer" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-teal-600" />
                </span>
                选择要导出的供应商
              </h2>
              <p className="text-sm text-gray-400 mt-1.5">
                每个供应商将导出为单独的 Excel 工作表
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={exportSupplierSearch}
                  onChange={(e) => setExportSupplierSearch(e.target.value)}
                  placeholder="搜索供应商..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="text-xs text-gray-500">
                  共 {filteredExportSuppliers.length} 个供应商，已选 {selectedExportSupplierIds.length}
                </div>
                <button
                  onClick={selectAllSuppliersForExport}
                  disabled={filteredExportSuppliers.length === 0}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  {allFilteredExportSuppliersSelected ? "取消全选" : "全选"}
                </button>
              </div>
              <div className="space-y-1.5">
                {filteredExportSuppliers.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                      selectedExportSupplierIds.includes(s.id)
                        ? "bg-teal-50 border-teal-200"
                        : "bg-gray-50 border-gray-100 hover:bg-gray-100/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedExportSupplierIds.includes(s.id)}
                      onChange={() => toggleExportSupplier(s.id)}
                      className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {s.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {s.productCount ?? 0} 个产品
                      </div>
                    </div>
                  </label>
                ))}
                {filteredExportSuppliers.length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-400">
                    没有匹配的供应商
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setExportDialogOpen(false)}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={confirmExport}
                disabled={selectedExportSupplierIds.length === 0}
                className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white shadow-md shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认导出 ({selectedExportSupplierIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImages.length > 0 && (
        <Lightbox
          images={lightboxImages}
          onClose={() => setLightboxImages([])}
        />
      )}
    </div>
  );
}
