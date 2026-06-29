"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductListItem } from "@/lib/types";

interface DeleteDialogProps {
  open: boolean;
  product: ProductListItem | null;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
}

export function DeleteProductDialog({
  open,
  product,
  onClose,
  onConfirm,
}: DeleteDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  function handleClose() {
    setConfirmText("");
    onClose();
  }

  async function handleConfirm() {
    if (!product || confirmText !== "DELETE" || deleting) return;
    setDeleting(true);
    try {
      await onConfirm(product.id);
    } finally {
      setDeleting(false);
      setConfirmText("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>确定删除？</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm">
            产品: <b>{product?.name}</b>
          </p>
          <p className="text-xs text-[#c64b3a]">
            ⚠️ 此操作不可撤销，将同时删除所有规格和图片
          </p>
          <p className="text-xs text-[#637066]">
            请输入{" "}
            <code className="bg-[#fff3cd] px-1 rounded">DELETE</code> 确认：
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button
              className="bg-[#c64b3a] hover:bg-[#a83d2f]"
              disabled={confirmText !== "DELETE" || deleting}
              onClick={handleConfirm}
            >
              {deleting ? "删除中..." : "确定删除"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
