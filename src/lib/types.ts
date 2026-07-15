// 统一类型定义

import type { ProductGroup, ProductSpec, ProductImage, Supplier, User } from "@prisma/client";

// 带关联的产品组
export type ProductGroupWithRelations = ProductGroup & {
  supplier: Supplier;
  specs: ProductSpec[];
  images: ProductImage[];
};

// 产品列表项（前端用）
export interface ProductListItem extends ProductGroupWithRelations {}

// 供应商列表项
export interface SupplierListItem {
  id: number;
  name: string;
  contact: string | null;
  remark: string | null;
  productCount: number;
  createdAt: Date;
}

// 规格输入
export interface SpecInput {
  sku: string;
  spec: string;
  costPrice: string;
  salePrice: string;
  carModel: string;
  oeCode: string;
}

// 产品表单数据
export interface ProductFormData {
  sku: string;
  supplierId: number;
  name: string;
  productLink: string | null;
  productWeight: string | null;
  productSize: string | null;
  packageSize: string | null;
  packageWeight: string | null;
  boxQuantity: string | null;
  isPublic: boolean;
  remark: string | null;
  version: number;
  specs: SpecInput[];
  images: string[];
}

// API 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// API 通用响应
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  currentVersion?: number;
  success?: boolean;
}

// 用户列表项
export interface UserListItem {
  id: number;
  username: string;
  displayName: string | null;
  role: UserRole;
  isActive?: boolean;
  failedLoginCount?: number;
  lockedUntil?: Date | string | null;
  mustChangePassword?: boolean;
  passwordUpdatedAt?: Date | string | null;
  productCount: number;
  createdAt: Date | string;
  visibleSupplierIds?: number[];
}

// 审计日志项
export interface AuditLogItem {
  id: number;
  user: { id: number; username: string; displayName: string | null } | null;
  action: string;
  entityType: string;
  entityId: number | null;
  detail: string | null;
  ipAddress: string | null;
  createdAt: Date | string;
}

// 用户角色
export type UserRole = "admin" | "editor" | "viewer";

// 目录产品（公开）
export interface CatalogProduct {
  id: number;
  sku: string;
  name: string;
  images: { filePath: string }[];
  specs: {
    sku: string;
    spec: string;
    salePrice: string | null;
    carModel: string;
    oeCode: string;
  }[];
}

// Dashboard 统计
export interface DashboardStats {
  totalGroups: number;
  totalSuppliers: number;
  totalSpecs: number;
  totalImages: number;
  recentGroupsCount: number;
  supplierBreakdown: { id: number; name: string; count: number }[];
  recentActivity: {
    id: number;
    action: string;
    entityType: string;
    entityId: number | null;
    detail: string | null;
    createdAt: string;
    user: string;
  }[];
}
