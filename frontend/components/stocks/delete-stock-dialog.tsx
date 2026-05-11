"use client";

import type { StockQuote } from "@shared/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteStockDialogProps = {
  quote: StockQuote | null;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * 渲染移除自选标的的二次确认弹窗。
 */
export function DeleteStockDialog({
  quote,
  onClose,
  onConfirm,
}: DeleteStockDialogProps) {
  return (
    <AlertDialog
      open={Boolean(quote)}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>移除自选标的？</AlertDialogTitle>
          <AlertDialogDescription>
            {quote
              ? `将从自选列表中移除 ${quote.name || quote.code}，并清理该标的的提醒规则。`
              : "将从自选列表中移除该标的，并清理提醒规则。"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
