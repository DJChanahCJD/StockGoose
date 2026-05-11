"use client";

import type { StockSearchItem } from "@shared/types";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toSecid } from "@/stores";

type AddStockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  searchResults: StockSearchItem[];
  watchlist: string[];
  onAdd: (item: StockSearchItem) => void;
};

/**
 * 渲染搜索并添加自选标的的弹窗。
 */
export function AddStockDialog({
  open,
  onOpenChange,
  searchTerm,
  onSearchChange,
  isSearching,
  searchResults,
  watchlist,
  onAdd,
}: AddStockDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden gap-0 sm:max-w-md">
        <DialogHeader className="p-4 border-b border-border bg-muted/30">
          <DialogTitle>搜索并添加股票</DialogTitle>
        </DialogHeader>
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索代码或名称 (如: AAPL)..."
              className="w-full bg-background border border-input rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-ring transition-all outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="overflow-y-auto p-2 min-h-[100px] max-h-[60vh]">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              搜索中...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              输入关键词开始搜索
            </div>
          ) : (
            searchResults.map((item) => {
              const secid = toSecid(item);
              const added = watchlist.includes(secid);
              return (
                <div
                  key={secid}
                  className="flex items-center justify-between p-3 hover:bg-accent rounded-xl transition-colors"
                >
                  <div>
                    <div className="font-bold text-foreground">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.market}.{item.code}
                    </div>
                  </div>
                  <button
                    disabled={added}
                    onClick={() => onAdd(item)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      added
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    )}
                  >
                    {added ? "已在自选" : "加入自选"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
