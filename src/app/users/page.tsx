"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import type { UserListItem as OriginalUserListItem, UserRole, SupplierListItem } from "@/lib/types";

type UserListItem = OriginalUserListItem & {
  password?: string;
};

import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  fetchSuppliers,
} from "@/lib/api";

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bgColor: string }> = {
  admin: { label: "管理员", color: "text-red-700", bgColor: "bg-red-50 border-red-200" },
  editor: { label: "编辑者", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  viewer: { label: "查看者", color: "text-gray-600", bgColor: "bg-gray-50 border-gray-200" },
};

export default function UsersPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const role = (session?.user as { role?: string })?.role;

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [formUsername, setFormUsername] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("viewer");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 供应商可见性管理
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [visibilityUser, setVisibilityUser] = useState<UserListItem | null>(null);
  const [visibilityIds, setVisibilityIds] = useState<number[]>([]);
  const [visibilitySaving, setVisibilitySaving] = useState(false);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (role && role !== "admin") {
      router.push("/403");
    }
  }, [sessionStatus, role, router]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (role === "admin") {
      loadUsers();
      loadSuppliers();
    }
  }, [role]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetchUsers();
      setUsers(res.data || []);
    } catch {
      toast.error("加载用户列表失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadSuppliers() {
    try {
      const res = await fetchSuppliers();
      setSuppliers(res.data || []);
    } catch {
      // ignore
    }
  }

  function openVisibility(user: UserListItem) {
    setVisibilityUser(user);
    setVisibilityIds(user.visibleSupplierIds || []);
    setVisibilityOpen(true);
  }

  async function handleVisibilitySave() {
    if (!visibilityUser) return;
    setVisibilitySaving(true);
    try {
      await updateUser(visibilityUser.id, {
        visibleSupplierIds: visibilityIds,
      });
      toast.success("可见供应商已更新");
      setVisibilityOpen(false);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setVisibilitySaving(false);
    }
  }

  function toggleVisibilitySupplier(sid: number) {
    setVisibilityIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );
  }

  function openAdd() {
    setEditingUser(null);
    setFormUsername("");
    setFormDisplayName("");
    setFormPassword("");
    setFormRole("viewer");
    setFormOpen(true);
  }

  function openEdit(user: UserListItem) {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormDisplayName(user.displayName || "");
    setFormPassword("");
    setFormRole(user.role);
    setFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formUsername.trim()) {
      toast.error("请输入用户名");
      return;
    }
    if (!editingUser && !formPassword) {
      toast.error("新建用户必须设置密码");
      return;
    }
    if (formPassword && formPassword.length < 8) {
      toast.error("密码长度至少8位");
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          displayName: formDisplayName.trim() || undefined,
          role: formRole,
          ...(formPassword ? { password: formPassword } : {}),
        });
        toast.success("用户已更新");
      } else {
        await createUser({
          username: formUsername.trim(),
          displayName: formDisplayName.trim() || undefined,
          password: formPassword,
          role: formRole,
        });
        toast.success("用户已创建");
      }
      setFormOpen(false);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      toast.success("用户已删除");
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = search
    ? users.filter(
        (u) =>
          u.username.includes(search) ||
          (u.displayName && u.displayName.includes(search))
      )
    : users;

  return (
    <div className="min-h-screen bg-[#f8faf5]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="h-8 w-8 text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-[15px] font-bold text-gray-900 leading-tight">用户管理</h1>
              <p className="text-[11px] text-gray-400 leading-tight">管理系统用户账号</p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 premium-btn"
            onClick={openAdd}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> 新增用户
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[320px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              className="pl-8 h-8 text-sm bg-gray-50/50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20"
              placeholder="搜索用户名/显示名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-gray-400">共 {users.length} 个用户</span>
        </div>
      </div>

      {/* Table */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100/80 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              {search ? "未找到匹配的用户" : "暂无用户"}
            </p>
            {!search && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 premium-btn"
                onClick={openAdd}
              >
                <Plus className="w-4 h-4 mr-1" /> 新增用户
              </Button>
            )}
          </div>
        ) : (
          <div className="premium-table-wrapper smooth-appear">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b-2 border-emerald-600 w-16">#</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b-2 border-emerald-600">用户名</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b-2 border-emerald-600">显示名称</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b-2 border-emerald-600 w-24">角色</th>

                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b-2 border-emerald-600 w-36">创建时间</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b-2 border-emerald-600 w-16">可见</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wider text-[11px] border-b-2 border-emerald-600 w-24">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => (
                  <tr
                    key={u.id}
                    className={`${idx % 2 === 1 ? "bg-gray-50" : "bg-white"} hover:bg-emerald-50/50 transition-colors`}
                  >
                    <td className="px-4 py-2.5 border-b border-gray-100 text-gray-500">
                      {u.id}
                    </td>
                    <td className="px-4 py-2.5 border-b border-gray-100 font-medium text-gray-900">
                      {u.username}
                    </td>
                    <td className="px-4 py-2.5 border-b border-gray-100 text-gray-500">
                      {u.displayName || "-"}
                    </td>
                    <td className="px-4 py-2.5 border-b border-gray-100">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_CONFIG[u.role].bgColor}`}>
                        {ROLE_CONFIG[u.role].label}
                      </span>
                    </td>

                    <td className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-2.5 border-b border-gray-100 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-teal-700 hover:bg-teal-50"
                        onClick={() => openVisibility(u)}
                        title={`可见供应商: ${u.visibleSupplierIds?.length || 0} 个`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                    <td className="px-4 py-2.5 border-b border-gray-100">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => openEdit(u)}
                          title="编辑"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteTarget(u)}
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新增/编辑对话框 */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!saving) setFormOpen(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingUser ? "编辑用户" : "新增用户"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="userUsername">用户名 *</Label>
              <Input
                id="userUsername"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="输入用户名"
                required
                disabled={!!editingUser}
                className="focus:border-emerald-500 focus:ring-emerald-500/20"
              />
              {editingUser && (
                <p className="text-xs text-gray-400">用户名创建后不可修改</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userDisplayName">显示名称</Label>
              <Input
                id="userDisplayName"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="显示名称（可选）"
                className="focus:border-emerald-500 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userPassword">
                {editingUser ? "新密码（留空则不修改）" : "密码 *"}
              </Label>
              {editingUser && editingUser.password && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-md mb-1.5">
                  <span className="text-xs text-gray-500">当前密码：</span>
                  <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                    {editingUser.password}
                  </span>
                </div>
              )}
              <Input
                id="userPassword"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={editingUser ? "留空则不修改" : "至少8位"}
                required={!editingUser}
                minLength={editingUser ? undefined : 8}
                className="focus:border-emerald-500 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label>角色</Label>
              <div className="flex gap-2 flex-wrap">
                {(["admin", "editor", "viewer"] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      formRole === r
                        ? `${ROLE_CONFIG[r].bgColor} ring-2 ring-emerald-500/30`
                        : "bg-white text-gray-500 border-gray-200 hover:border-emerald-300"
                    }`}
                    onClick={() => setFormRole(r)}
                  >
                    {ROLE_CONFIG[r].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                取消
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={saving}
              >
                {saving ? "保存中..." : "确认保存"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!deleting) setDeleteTarget(open ? deleteTarget : null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除用户</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 py-4">
            确定要删除用户 <span className="font-medium text-gray-900">{deleteTarget?.username}</span> 吗？
            <br />
            此操作不可撤销。
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 供应商可见性管理对话框 */}
      <Dialog
        open={visibilityOpen}
        onOpenChange={(open) => { if (!visibilitySaving) setVisibilityOpen(open); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              管理用户可见供应商 - {visibilityUser?.displayName || visibilityUser?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              选择该用户可以看到哪些供应商的数据。不选任何供应商表示可以看到全部供应商。
            </p>
            <div className="flex gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 border-gray-200 text-gray-600 hover:border-emerald-300"
                onClick={() => {
                  if (visibilityIds.length === suppliers.length) {
                    setVisibilityIds([]);
                  } else {
                    setVisibilityIds(suppliers.map((s) => s.id));
                  }
                }}
              >
                {visibilityIds.length === suppliers.length ? "取消全选" : "全选"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 border-gray-200 text-gray-600 hover:border-red-300"
                onClick={() => setVisibilityIds([])}
              >
                清除全部
              </Button>
            </div>
            <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-lg">
              {suppliers.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-xs">暂无供应商</p>
              ) : (
                suppliers.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-b-0 ${
                      visibilityIds.includes(s.id) ? "bg-emerald-50/30" : ""
                    }`}
                  >
                    <Checkbox
                      checked={visibilityIds.includes(s.id)}
                      onCheckedChange={() => toggleVisibilitySupplier(s.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="flex-1">{s.name}</span>
                    <span className="text-xs text-gray-400">{s.productCount} 个产品</span>
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-gray-400">
                已选 {visibilityIds.length}/{suppliers.length} 个供应商
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setVisibilityOpen(false)}
                  disabled={visibilitySaving}
                >
                  取消
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleVisibilitySave}
                  disabled={visibilitySaving}
                >
                  {visibilitySaving ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
