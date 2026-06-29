import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "-";
  // 纯数字直接格式化
  if (typeof val === "number") return `¥${val.toFixed(2)}`;
  const str = String(val).trim();
  if (!str) return "-";
  // 去除 ¥ 前缀和逗号分隔符后，检查是否为纯数字
  const cleaned = str.replace(/^[¥￥]\s*/, "").replace(/,/g, "");
  const num = parseFloat(cleaned);
  // 仅当清理后的字符串是纯数字格式时，才按货币格式化
  if (!isNaN(num) && isFinite(num) && /^-?\d+(\.\d+)?$/.test(cleaned)) {
    return `¥${num.toFixed(2)}`;
  }
  // 含文字的价格直接原样显示（如 "22.0/包"、"待定"、"面议"）
  return str;
}

export function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
