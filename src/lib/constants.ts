// 表头列定义 — 与 PRD v3.0 完全一致

export const FIXED_LEFT_COLUMNS = ["产品组SKU", "产品图片"] as const;

// 新顺序: 产品名称 → 供应商 → 产品规格 → 规格SKU → OE码 → 拿货价格(元) → 销售价格(元) → 适配车型 → 产品链接 → 产品重量 → 产品尺寸 → 包装重量 → 包装尺寸 → 装箱数 → 备注
export const ALL_DISPLAY_COLUMNS = [
  "产品名称", "供应商", "产品规格", "规格SKU", "OE码",
  "拿货价格(元)", "销售价格(元)", "适配车型",
  "产品链接",
  "产品重量", "产品尺寸", "包装重量", "包装尺寸", "装箱数",
  "备注"
] as const;

export type ColumnName = typeof ALL_DISPLAY_COLUMNS[number];

// Group 层字段（产品组共用，rowspan 跨行）
export const GROUP_COLUMNS: ColumnName[] = [
  "产品名称", "供应商",
  "产品链接",
  "产品重量", "产品尺寸", "包装重量", "包装尺寸", "装箱数",
  "备注"
];

// Spec 层字段（每行规格独立值）
export const SPEC_COLUMNS: ColumnName[] = [
  "产品规格", "规格SKU", "OE码",
  "拿货价格(元)", "销售价格(元)", "适配车型"
];

// 固定列
export const FIXED_COLUMNS: ColumnName[] = [];

// 默认显示列
export const DEFAULT_COLUMNS: ColumnName[] = [
  "产品名称", "供应商", "产品规格", "拿货价格(元)",
  "销售价格(元)", "适配车型", "产品链接"
];

// 列预设方案
export const COLUMN_PRESETS: Record<string, ColumnName[]> = {
  "默认视图": ["产品名称", "供应商", "产品规格", "拿货价格(元)", "销售价格(元)", "适配车型", "产品链接"],
  "采购视图": ["产品名称", "供应商", "规格SKU", "拿货价格(元)", "产品链接", "产品重量", "包装尺寸", "装箱数"],
  "销售视图": ["产品名称", "产品规格", "销售价格(元)", "适配车型", "OE码"],
  "仓库视图": ["产品名称", "产品尺寸", "包装尺寸", "包装重量", "装箱数"],
};

// 列宽配置
export const COLUMN_WIDTHS: Record<string, string> = {
  "产品组SKU": "120px",
  "产品图片": "100px",
  "产品名称": "140px",
  "供应商": "80px",
  "适配车型": "90px",
  "OE码": "90px",
  "产品链接": "100px",
  "产品重量": "65px",
  "产品尺寸": "80px",
  "包装尺寸": "80px",
  "包装重量": "65px",
  "装箱数": "65px",
  "备注": "100px",
  "规格SKU": "90px",
  "产品规格": "110px",
  "拿货价格(元)": "80px",
  "销售价格(元)": "80px",
};

// 判断列层级
export function isGroupCol(col: string): boolean {
  if (!col) return false;
  return (GROUP_COLUMNS as readonly string[]).includes(col);
}

export function isSpecCol(col: string): boolean {
  if (!col) return false;
  return (SPEC_COLUMNS as readonly string[]).includes(col);
}
