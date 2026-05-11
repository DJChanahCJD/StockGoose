"use client";

import { Palette, Search, X } from "lucide-react";
import { GooseLogo } from "@/components/logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ColorMode } from "./stock-utils";

type StockHeaderProps = {
  filterTerm: string;
  onFilterChange: (value: string) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
};

/**
 * 渲染自选页顶部栏和全局列表过滤控件。
 */
export function StockHeader({
  filterTerm,
  onFilterChange,
  colorMode,
  onColorModeChange,
}: StockHeaderProps) {
  return (
    <header
      className="h-14 bg-card border-b border-border select-none shrink-0 z-10"
      data-tauri-drag-region
    >
      <div className="max-w-7xl mx-auto w-full h-full px-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 text-foreground">
          <GooseLogo className="w-5 h-5" />
          <span className="font-bold tracking-tight text-sm">StockGoose</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="relative group w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <input
              value={filterTerm}
              onChange={(event) => onFilterChange(event.target.value)}
              placeholder="搜索自选代码或名称..."
              className="w-full bg-background border border-input rounded-full py-1.5 pl-9 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-muted-foreground text-foreground"
            />
            {filterTerm && (
              <button
                onClick={() => onFilterChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => onColorModeChange(colorMode === "us" ? "cn" : "us")}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={
              colorMode === "us"
                ? "切换为红涨绿跌 (国内市场)"
                : "切换为绿涨红跌 (国外市场)"
            }
          >
            <Palette className="w-4 h-4" />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
