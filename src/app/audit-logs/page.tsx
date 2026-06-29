"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import type { AuditLogItem } from "@/lib/types";
import { fetchAuditLogs } from "@/lib/api";
import { toast } from "sonner";

const ACTION_OPTIONS = [
  { value: "", label: "全部操作" },
  { value: "CREATE", label: "创建" },
  { value: "UPDATE", label: "更新" },
  { value: "DELETE", label: "删除" },
  { value: "CREATE_USER", label: "创建用户" },
  { value: "UPDATE_USER", label: "更新用户" },
  { value: "DELETE_USER", label: "删除用户" },
];

const ENTITY_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "product_group", label: "产品" },
  { value: "user", label: "用户" },
  { value: "supplier", label: "供应商" },
];

const ACTION_LABELS: Record<string, { text: string; color: string; bgColor: string }> = {
  CREATE: { text: "创建", color: "text-emerald-700", bgColor: "bg-emerald-50" },
  UPDATE: { text: "更新", color: "text-blue-700", bgColor: "bg-blue-50" },
  DELETE: { text: "删除", color: "text-red-700", bgColor: "bg-red-50" },
  CREATE_USER: { text: "创建用户", color: "text-emerald-700", bgColor: "bg-emerald-50" },
  UPDATE_USER: { text: "更新用户", color: "text-blue-700", bgColor: "bg-blue-50" },
  DELETE_USER: { text: "删除用户", color: "text-red-700", bgColor: "bg-red-50" },
};

export default function AuditLogsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const role = (session?.user as { role?: string })?.role;

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [search, setSearch] = useState("");
  const pageSize = 20;

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (role && role !== "admin") router.push("/403");
  }, [sessionStatus, role, router]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAuditLogs({
        page,
        pageSize,
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
      });
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch {
      toast.error("加载审计日志失败");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, page]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (role === "admin") loadLogs();
  }, [sessionStatus, role, loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.detail?.toLowerCase().includes(q) ||
      log.user?.username?.toLowerCase().includes(q) ||
      log.user?.displayName?.toLowerCase().includes(q)
    );
  });

  function formatAction(action: string) {
    const config = ACTION_LABELS[action];
    if (!config) return action;
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
        {config.text}
      </span>
    );
  }

  function formatEntityType(type: string) {
    return ENTITY_OPTIONS.find((o) => o.value === type)?.label || type;
  }

  return (
    <div className="min-h-screen bg-[#f8faf5]">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="h-8 w-8 text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-[15px] font-bold text-gray-900 leading-tight">审计日志</h1>
              <p className="text-[11px] text-gray-400 leading-tight">系统操作记录</p>
            </div>
          </div>
          <span className="text-xs text-gray-400">共 {total} 条记录</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={actionFilter || "all"} onValueChange={(v) => { setActionFilter(v === "all" ? "" : v ?? ""); setPage(1); }}>
            <SelectTrigger className="h-8 w-[140px] text-sm border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20">
              <SelectValue placeholder="操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部操作</SelectItem>
              {ACTION_OPTIONS.filter((o) => o.value).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={entityFilter || "all"} onValueChange={(v) => { setEntityFilter(v === "all" ? "" : v ?? ""); setPage(1); }}>
            <SelectTrigger className="h-8 w-[140px] text-sm border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20">
              <SelectValue placeholder="实体类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {ENTITY_OPTIONS.filter((o) => o.value).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="h-8 text-sm bg-gray-50/50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 max-w-[280px]"
            placeholder="搜索操作详情..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">暂无审计日志</div>
        ) : (
          <>
            <div className="premium-table-wrapper smooth-appear overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-500 text-[11px] border-b-2 border-emerald-600 w-12">#</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-500 text-[11px] border-b-2 border-emerald-600">操作用户</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-500 text-[11px] border-b-2 border-emerald-600 w-24">操作类型</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-500 text-[11px] border-b-2 border-emerald-600 w-24">实体类型</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-500 text-[11px] border-b-2 border-emerald-600 w-16">实体ID</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-500 text-[11px] border-b-2 border-emerald-600">详情</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-500 text-[11px] border-b-2 border-emerald-600 w-32">IP地址</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-500 text-[11px] border-b-2 border-emerald-600 w-40">操作时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, idx) => (
                    <tr key={log.id} className={`${idx % 2 === 1 ? "bg-gray-50" : "bg-white"} hover:bg-emerald-50/50 transition-colors`}>
                      <td className="px-4 py-2.5 border-b border-gray-100 text-gray-500">{log.id}</td>
                      <td className="px-4 py-2.5 border-b border-gray-100">
                        {log.user ? (
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{log.user.displayName || log.user.username}</div>
                            <div className="text-xs text-gray-400">{log.user.username}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 border-b border-gray-100">{formatAction(log.action)}</td>
                      <td className="px-4 py-2.5 border-b border-gray-100 text-gray-500">{formatEntityType(log.entityType)}</td>
                      <td className="px-4 py-2.5 border-b border-gray-100 text-gray-500">{log.entityId ?? "-"}</td>
                      <td className="px-4 py-2.5 border-b border-gray-100 text-gray-500 max-w-[240px] truncate">{log.detail || "-"}</td>
                      <td className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500">{log.ipAddress || "-"}</td>
                      <td className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500">{new Date(log.createdAt).toLocaleString("zh-CN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  上一页
                </Button>
                <span className="text-sm text-gray-500">第 {page} / {totalPages} 页</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
