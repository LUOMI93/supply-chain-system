// 统一 API 客户端封装
// 自动处理错误、JSON 解析和类型推断

import type {
  ProductListItem,
  SupplierListItem,
  PaginatedResponse,
  ApiResponse,
  CatalogProduct,
  ProductFormData,
  UserListItem,
  AuditLogItem,
  DashboardStats,
} from "@/lib/types";

const BASE_URL = "";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      data?.error || `请求失败 (${res.status})`,
      res.status,
      data
    );
  }

  return data as T;
}

// ========== 产品 API ==========

export async function fetchProducts(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  supplierId?: string;
}): Promise<PaginatedResponse<ProductListItem>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.supplierId) searchParams.set("supplierId", params.supplierId);

  return request<PaginatedResponse<ProductListItem>>(
    `/api/products?${searchParams}`
  );
}

export async function fetchProduct(id: number): Promise<ProductListItem> {
  const response = await request<ApiResponse<ProductListItem[]>>(`/api/products?id=${id}`);
  const product = response.data?.[0];
  if (!product) {
    throw new ApiError("产品不存在", 404, response);
  }
  return product;
}

export async function createProduct(
  data: ProductFormData
): Promise<ProductListItem> {
  return request<ProductListItem>("/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProduct(
  id: number,
  data: ProductFormData
): Promise<ProductListItem> {
  return request<ProductListItem>("/api/products", {
    method: "PUT",
    body: JSON.stringify({ ...data, id }),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  await request("/api/products", {
    method: "DELETE",
    body: JSON.stringify({ ids: [id] }),
  });
}

// 批量删除产品
export async function deleteProducts(ids: number[]): Promise<{ count: number }> {
  return request<{ count: number }>("/api/products", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

export async function exportProducts(params: {
  search?: string;
  supplierIds?: string; // 逗号分隔，如 "1,2,3"
  supplierId?: string; // 兼容旧的单个供应商参数
}): Promise<void> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.supplierIds) searchParams.set("supplierIds", params.supplierIds);
  else if (params.supplierId) searchParams.set("supplierId", params.supplierId);

  // 使用 fetch + blob 下载，避免 popup blocker 拦截 window.open
  const response = await fetch(`/api/export?${searchParams}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `导出失败 (HTTP ${response.status})` }));
    throw new Error(err.error || "导出失败");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // 从 Content-Disposition 头提取文件名，或使用默认文件名
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*=UTF-8''(.+)/) || disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? decodeURIComponent(match[1]) : `产品导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ========== 供应商 API ==========

export async function fetchSuppliers(): Promise<ApiResponse<SupplierListItem[]>> {
  return request<ApiResponse<SupplierListItem[]>>("/api/suppliers");
}

export async function createSupplier(data: {
  name: string;
  contact?: string;
  remark?: string;
}): Promise<SupplierListItem> {
  return request<SupplierListItem>("/api/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSupplier(
  id: number,
  data: {
    name: string;
    contact?: string;
    remark?: string;
  }
): Promise<SupplierListItem> {
  return request<SupplierListItem>(`/api/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSupplier(id: number): Promise<void> {
  await request(`/api/suppliers/${id}`, {
    method: "DELETE",
    headers: {},
  });
}

// 批量删除供应商
export async function deleteSuppliers(ids: number[]): Promise<{ count: number }> {
  return request<{ count: number }>("/api/suppliers", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

// ========== 目录 API ==========

export async function fetchCatalog(): Promise<ApiResponse<CatalogProduct[]>> {
  return request<ApiResponse<CatalogProduct[]>>("/api/catalog");
}

export { ApiError };

// ========= 审计日志 API =========

export async function fetchAuditLogs(params: {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
  userId?: number;
}): Promise<PaginatedResponse<AuditLogItem>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.action) searchParams.set("action", params.action);
  if (params.entityType) searchParams.set("entityType", params.entityType);
  if (params.userId) searchParams.set("userId", String(params.userId));

  return request<PaginatedResponse<AuditLogItem>>(
    `/api/audit-logs?${searchParams}`
  );
}

// ========= 用户管理 API =========

export async function fetchUsers(): Promise<ApiResponse<UserListItem[]>> {
  return request<ApiResponse<UserListItem[]>>("/api/users");
}

export async function createUser(data: {
  username: string;
  displayName?: string;
  password: string;
  role?: "admin" | "editor" | "viewer";
}): Promise<UserListItem> {
  return request<UserListItem>("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUser(
  id: number,
  data: {
    displayName?: string | null;
    role?: "admin" | "editor" | "viewer";
    password?: string;
    visibleSupplierIds?: number[];
  }
): Promise<UserListItem> {
  return request<UserListItem>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: number): Promise<void> {
  await request(`/api/users/${id}`, { method: "DELETE" });
}

// ========= Dashboard 统计 API =========

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>("/api/dashboard/stats");
}
