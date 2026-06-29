"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: PaginationProps) {
  const [jumpValue, setJumpValue] = useState("");

  if (totalPages <= 1) return null;

  function handleJump() {
    const num = parseInt(jumpValue, 10);
    if (isNaN(num)) return;
    const clamped = Math.max(1, Math.min(num, totalPages));
    if (clamped !== page) {
      onPageChange(clamped);
    }
    setJumpValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleJump();
    }
  }

  return (
    <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
      <span>共 {total} 条记录</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="border-gray-200 text-gray-600 hover:bg-gray-50 h-7 px-2 text-xs"
        >
          上一页
        </Button>
        <span className="px-1 flex items-center text-xs text-gray-500 whitespace-nowrap">
          第
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={jumpValue || page}
          onChange={(e) => setJumpValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            setJumpValue("");
            e.target.select();
          }}
          onBlur={() => setJumpValue("")}
          className="w-12 h-7 text-center text-xs border border-gray-200 rounded px-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
        <span className="flex items-center text-xs text-gray-500 whitespace-nowrap">
          / {totalPages} 页
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="border-gray-200 text-gray-600 hover:bg-gray-50 h-7 px-2 text-xs"
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
