"use client";

import type { AlertRule, StockQuote } from "@shared/types";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AlertDraft } from "./stock-utils";
import { ALERT_LABELS, ALERT_OPTIONS, formatNumber } from "./stock-utils";

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
  const quoteAlerts = quote
    ? alerts.filter((alert) => alert.secid === quote.secid)
    : [];

  return (
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
                <select
                  value={draft.type}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      type: event.target.value as AlertRule["type"],
                    })
                  }
                  className="flex-1 bg-background border border-input rounded-lg px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring text-foreground"
                >
                  {ALERT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="数值"
                  value={draft.threshold}
                  onChange={(event) =>
                    onDraftChange({ ...draft, threshold: event.target.value })
                  }
                  className="w-24 bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring text-foreground"
                />
              </div>
              <button
                onClick={onAddAlert}
                className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> 添加规则
              </button>

              <div className="mt-4">
                <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                  已有规则
                </h4>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {quoteAlerts.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between bg-secondary/50 px-3 py-2 rounded-lg border border-border"
                    >
                      <span className="text-xs font-medium text-secondary-foreground">
                        {ALERT_LABELS[rule.type]} {rule.threshold}
                        {rule.type.includes("CHANGE") ? "%" : ""}
                      </span>
                      <button
                        onClick={() => onRemoveAlert(rule.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {quoteAlerts.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4 bg-secondary/50 rounded-lg border border-border border-dashed">
                      暂无提醒规则
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
