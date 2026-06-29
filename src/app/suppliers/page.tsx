"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Factory, Search } from "lucide-react";
import type { SupplierListItem } from "@/lib/types";
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  deleteSuppliers,
} from "@/lib/api";

export default function SuppliersPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const role = (session?.user as { role?: string })?.role;

  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // 新增
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newRemark, setNewRemark] = useState("");
  const [saving, setSaving] = useState(false);

  // 编辑
  const [editOpen, setEditOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierListItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // 单个删除
  const [deleteTarget, setDeleteTarget] = useState<SupplierListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 批量删除
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  // 编辑模式
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (role && !["admin", "editor"].includes(role)) {
      router.push("/403");
    }
  }, [sessionStatus, role, router]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);
    try {
      const res = await fetchSuppliers();
      const data = res.data || [];
      setSuppliers(data);
      setSelectedIds((prev) => {
        const idSet = new Set(data.map((s) => s.id));
        return prev.filter((id) => idSet.has(id));
      });
    } catch {
      toast.error("加载供应商列表失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("请输入供应商名称");
      return;
    }

    setSaving(true);
    try {
      await createSupplier({
        name: newName.trim(),
        contact: newContact.trim() || undefined,
        remark: newRemark.trim() || undefined,
      });
      toast.success("供应商已添加");
      setAddOpen(false);
      setNewName("");
      setNewContact("");
      setNewRemark("");
      loadSuppliers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "添加失败");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(s: SupplierListItem) {
    setEditingSupplier(s);
    setEditName(s.name);
    setEditContact(s.contact || "");
    setEditRemark(s.remark || "");
    setEditOpen(true);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("请输入供应商名称");
      return;
    }

    setEditSaving(true);
    try {
      await updateSupplier(editingSupplier!.id, {
        name: editName.trim(),
        contact: editContact.trim() || undefined,
        remark: editRemark.trim() || undefined,
      });
      toast.success("供应商已更新");
      setEditOpen(false);
      loadSuppliers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新失败");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSupplier(deleteTarget.id);
      toast.success("供应商已删除");
      setDeleteTarget(null);
      loadSuppliers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    const filteredIds = filtered.map((s) => s.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      const newSet = new Set(selectedIds);
      filteredIds.forEach((id) => newSet.add(id));
      setSelectedIds(Array.from(newSet));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await deleteSuppliers(selectedIds);
      toast.success(`已删除 ${res.count} 个供应商`);
      setBulkDeleteOpen(false);
      setSelectedIds([]);
      loadSuppliers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBulkDeleting(false);
    }
  }

  const filtered = search
    ? suppliers.filter(
        (s) =>
          s.name.includes(search) ||
          (s.contact && s.contact.includes(search)) ||
          (s.remark && s.remark.includes(search))
      )
    : suppliers;

  const allSelected =
    filtered.length > 0 &&
    filtered.every((s) => selectedIds.includes(s.id));

  // Statistics
  const totalProducts = suppliers.reduce((sum, s) => sum + (s.productCount || 0), 0);
  const activeSuppliers = suppliers.filter(s => (s.productCount || 0) > 0).length;

  return (
    <div className="min-h-screen bg-[#f6f8f4]">
      {/* Header - Premium */}
      <div className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-gray-100/80 shadow-sm">
        <div className="px-6 py-4">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
                className="h-10 w-10 text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center shadow-md shadow-teal-500/20">
                <Factory className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-[17px] font-bold text-gray-800 leading-tight tracking-tight">供应商管理</h1>
                <p className="text-[12px] text-gray-400 leading-tight mt-0.5">管理产品供应商信息 · Supplier Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {role === "admin" && editMode && selectedIds.length > 0 && (
                <Button
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl h-10 px-4 shadow-sm shadow-red-500/15 transition-all"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  批量删除 ({selectedIds.length})
                </Button>
              )}
              {role === "admin" && (
                <Button
                  size="sm"
                  variant={editMode ? "default" : "outline"}
                  onClick={() => {
                    if (editMode) {
                      setEditMode(false);
                      setSelectedIds([]);
                    } else {
                      setEditMode(true);
                    }
                  }}
                  className={editMode ? "bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-10 px-4" : "border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl h-10 px-4"}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  {editMode ? "退出编辑" : "编辑模式"}
                </Button>
              )}
              {role === "admin" && (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-xl h-10 px-4 shadow-md shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-600/25 transition-all"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> 新增供应商
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="group relative bg-white rounded-xl border border-gray-100 p-4 transition-all duration-300 hover:shadow-md hover:border-teal-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100/30 flex items-center justify-center">
                    <Factory className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">供应商总数</p>
                    <p className="text-xl font-bold text-gray-800 tracking-tight leading-none mt-1">{suppliers.length}</p>
                  </div>
                </div>
              </div>

              <div className="group relative bg-white rounded-xl border border-gray-100 p-4 transition-all duration-300 hover:shadow-md hover:border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100/30 flex items-center justify-center">
                    <Factory className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">活跃供应商</p>
                    <p className="text-xl font-bold text-gray-800 tracking-tight leading-none mt-1">{activeSuppliers}</p>
                  </div>
                </div>
              </div>

              <div className="group relative bg-white rounded-xl border border-gray-100 p-4 transition-all duration-300 hover:shadow-md hover:border-cyan-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-100/30 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">产品总数</p>
                    <p className="text-xl font-bold text-gray-800 tracking-tight leading-none mt-1">{totalProducts}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar - Refined */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-[400px]">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <Input
                className="h-10 pl-10 pr-4 rounded-xl bg-gray-50/60 border border-gray-200/80 text-sm text-gray-700 placeholder:text-gray-400 transition-all focus:bg-white focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 shadow-sm"
                placeholder="搜索供应商名称 / 联系方式 / 备注..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-[12px] text-gray-400 ml-auto">
              共 <span className="text-gray-600 font-semibold">{suppliers.length}</span> 个供应商
              {selectedIds.length > 0 && <span className="text-teal-600">，已选 {selectedIds.length} 个</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-teal-50/30 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-gray-100/80">
              <Factory className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 text-[14px] mb-2">
              {search ? "未找到匹配的供应商" : "暂无供应商"}
            </p>
            <p className="text-gray-400 text-[12px] mb-6">
              {search ? "请尝试其他搜索关键词" : "开始创建您的第一个供应商"}
            </p>
            {!search && (
              <Button
                className="bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-xl h-10 px-5 shadow-md shadow-teal-600/20 transition-all hover:shadow-lg"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" /> 新增供应商
              </Button>
            )}
          </div>
        ) : (
          <div className="premium-table-wrapper smooth-appear">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {role === "admin" && editMode && (
                    <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b border-gray-200 w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        className="mx-auto data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                        title="全选/取消全选当前页"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b border-gray-200 w-16">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b border-gray-200">
                    供应商名称
                  </th>
                  {role === "admin" && (
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b border-gray-200">
                      联系方式
                    </th>
                  )}
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b border-gray-200">
                    备注
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b border-gray-200 w-28">
                    产品数
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b border-gray-200 w-36">
                    创建时间
                  </th>
                  {role === "admin" && (
                    <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b border-gray-200 w-24">
                      操作
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`${idx % 2 === 1 ? "bg-gray-50/50" : "bg-white"} hover:bg-teal-50/50 transition-colors ${
                      selectedIds.includes(s.id) ? "!bg-teal-50/70" : ""
                    }`}
                  >
                    {role === "admin" && editMode && (
                      <td className="px-4 py-3.5 border-b border-gray-100 text-center">
                        <Checkbox
                          checked={selectedIds.includes(s.id)}
                          onCheckedChange={() => toggleSelect(s.id)}
                          className="mx-auto data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3.5 border-b border-gray-100 text-gray-400 font-mono text-[12px]">
                      #{s.id}
                    </td>
                    <td className="px-4 py-3.5 border-b border-gray-100 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100/50 flex items-center justify-center shrink-0">
                          <Factory className="w-3.5 h-3.5 text-teal-600" />
                        </div>
                        <span>{s.name}</span>
                      </div>
                    </td>
                    {role === "admin" && (
                      <td className="px-4 py-3.5 border-b border-gray-100 text-gray-500 text-[13px]">
                        {s.contact || "-"}
                      </td>
                    )}
                    <td className="px-4 py-3.5 border-b border-gray-100 text-gray-500 text-[13px] max-w-[200px] truncate">
                      {s.remark || "-"}
                    </td>
                    <td className="px-4 py-3.5 border-b border-gray-100 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                          s.productCount > 0
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100/50"
                            : "bg-gray-50 text-gray-500 border-gray-200/50"
                        }`}
                      >
                        {s.productCount} 个
                      </span>
                    </td>
                    <td className="px-4 py-3.5 border-b border-gray-100 text-[12px] text-gray-400">
                      {new Date(s.createdAt).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit"
                      })}
                    </td>
                    {role === "admin" && (
                      <td className="px-4 py-3.5 border-b border-gray-100">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all"
                            onClick={() => openEdit(s)}
                            title="编辑"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            onClick={() => setDeleteTarget(s)}
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm rounded-2xl border border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-800 font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center">
                <Plus className="w-4 h-4 text-teal-600" />
              </div>
              新增供应商
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="supplierName" className="text-[13px] text-gray-600 font-medium">供应商名称 *</Label>
              <Input
                id="supplierName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="输入供应商名称"
                required
                className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierContact" className="text-[13px] text-gray-600 font-medium">联系方式</Label>
              <Input
                id="supplierContact"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                placeholder="电话 / 微信等"
                className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierRemark" className="text-[13px] text-gray-600 font-medium">备注</Label>
              <Input
                id="supplierRemark"
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                placeholder="备注信息"
                className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                className="h-10 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 px-4"
              >
                取消
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white shadow-md shadow-teal-600/20 px-5"
                disabled={saving}
              >
                {saving ? "添加中..." : "确认添加"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!editSaving) setEditOpen(open);
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl border border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-800 font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
                <Pencil className="w-4 h-4 text-blue-600" />
              </div>
              编辑供应商
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="editSupplierName" className="text-[13px] text-gray-600 font-medium">供应商名称 *</Label>
              <Input
                id="editSupplierName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="输入供应商名称"
                required
                className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editSupplierContact" className="text-[13px] text-gray-600 font-medium">联系方式</Label>
              <Input
                id="editSupplierContact"
                value={editContact}
                onChange={(e) => setEditContact(e.target.value)}
                placeholder="电话 / 微信等"
                className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editSupplierRemark" className="text-[13px] text-gray-600 font-medium">备注</Label>
              <Input
                id="editSupplierRemark"
                value={editRemark}
                onChange={(e) => setEditRemark(e.target.value)}
                placeholder="备注信息"
                className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
                className="h-10 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 px-4"
              >
                取消
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white shadow-md shadow-teal-600/20 px-5"
                disabled={editSaving}
              >
                {editSaving ? "保存中..." : "确认保存"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!deleting) setDeleteTarget(open ? deleteTarget : null);
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl border border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-800 font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              确认删除供应商
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-gray-500 py-4 leading-relaxed">
            确定要删除供应商{" "}
            <span className="font-semibold text-gray-800">{deleteTarget?.name}</span> 吗？
            {deleteTarget && deleteTarget.productCount > 0 && (
              <>
                <br />
                <span className="text-red-600 text-[13px]">
                  此供应商下还有 {deleteTarget.productCount} 个产品，将一并删除（含规格、图片）。
                </span>
              </>
            )}
            <br />
            <span className="text-gray-400 text-[12px]">此操作不可撤销。</span>
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="h-10 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 px-4"
            >
              取消
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20 px-5"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!bulkDeleting) setBulkDeleteOpen(open);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-800 font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              确认批量删除供应商
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-[13px] text-gray-600">
              您已选中 <span className="font-semibold text-gray-800">{selectedIds.length}</span> 个供应商。
            </p>
            <div className="bg-gray-50/80 rounded-xl p-3 max-h-48 overflow-y-auto border border-gray-100">
              {suppliers
                .filter((s) => selectedIds.includes(s.id))
                .map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-gray-100/50 last:border-b-0">
                    <span className="text-[13px] text-gray-700">{s.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                        s.productCount > 0
                          ? "bg-red-50 text-red-700 border-red-100/50"
                          : "bg-emerald-50 text-emerald-700 border-emerald-100/50"
                      }`}
                    >
                      {s.productCount > 0
                        ? `将一同删除 ${s.productCount} 个产品`
                        : "无关联产品"}
                    </span>
                  </div>
                ))}
            </div>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              注意：删除供应商时，其下所有产品（含规格、图片）将被一并删除。此操作不可撤销。
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={bulkDeleting}
              className="h-10 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 px-4"
            >
              取消
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20 px-5"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? "删除中..." : `确认删除 ${selectedIds.length} 个供应商`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
