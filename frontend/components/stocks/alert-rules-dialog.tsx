"use client";

import { useState } from "react";
import type { AlertRule, StockQuote } from "@shared/types";
import { Plus, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALERT_LABELS, ALERT_OPTIONS } from "@/lib/stocks/alert-rules";
import type { AlertDraft } from "./stock-utils";
import { formatNumber } from "./stock-utils";

type AlertRulesDialogProps = {
  quote: StockQuote | null;
  onClose: () => void;
  draft: AlertDraft;
  onDraftChange: (draft: AlertDraft) => void;
  onAddAlert: () => void;
  alerts: AlertRule[];
  onRemoveAlert: (id: string) => void;
};

/**
 * 渲染单个标的的提醒规则管理弹窗。
 */
export function AlertRulesDialog({
  quote,
  onClose,
  draft,
  onDraftChange,
  onAddAlert,
  alerts,
  onRemoveAlert,
}: AlertRulesDialogProps) {
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  const quoteAlerts = quote
    ? alerts.filter((alert) => alert.secid === quote.secid)
    : [];

  const handleConfirmDelete = () => {
    if (ruleToDelete) {
      onRemoveAlert(ruleToDelete);
      setRuleToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={Boolean(quote)} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-0 overflow-hidden gap-0 sm:max-w-sm">
          {quote && (
            <>
              <DialogHeader className="p-4 border-b border-border bg-muted/30">
                <DialogTitle>设置提醒</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {quote.code} - 当前: {formatNumber(quote.price, 2)}
                </p>
              </DialogHeader>

              <div className="p-5 flex flex-col gap-4">
                <div className="flex gap-2">
                  <Select
                    value={draft.type}
                    onValueChange={(value) =>
                      onDraftChange({
                        ...draft,
                        type: value as AlertRule["type"],
                      })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="选择提醒类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="数值"
                    value={draft.threshold}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        threshold: event.target.value,
                      })
                    }
                    className="w-24"
                  />
                </div>
                <Button onClick={onAddAlert} className="w-full">
                  <Plus data-icon="inline-start" />
                  添加规则
                </Button>

                <div className="mt-4">
                  <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                    已有规则
                  </h4>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {quoteAlerts.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <span className="text-xs font-medium text-secondary-foreground">
                          {ALERT_LABELS[rule.type]} {rule.threshold}
                          {rule.type.includes("CHANGE") ? "%" : ""}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRuleToDelete(rule.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    {quoteAlerts.length === 0 && (
                      <Empty>
                        <EmptyDescription>暂无提醒规则</EmptyDescription>
                      </Empty>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(ruleToDelete)}
        onOpenChange={(open) => !open && setRuleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条提醒规则吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
