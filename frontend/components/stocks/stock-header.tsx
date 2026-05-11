"use client";

import { Grid2X2, List, Palette, Search, X } from "lucide-react";
import { GooseLogo } from "@/components/logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ColorMode, MarketFilter, StockViewMode } from "./stock-utils";

type StockHeaderProps = {
  filterTerm: string;
  onFilterChange: (value: string) => void;
  marketFilter: MarketFilter;
  onMarketFilterChange: (value: MarketFilter) => void;
  viewMode: StockViewMode;
  onViewModeChange: (value: StockViewMode) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
};

/**
 * 渲染自选页顶部栏和全局列表过滤控件。
 */
export function StockHeader({
  filterTerm,
  onFilterChange,
  marketFilter,
  onMarketFilterChange,
  viewMode,
  onViewModeChange,
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
          <Select
            value={marketFilter}
            onValueChange={(value) =>
              onMarketFilterChange(value as MarketFilter)
            }
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-[92px] rounded-full text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="cn">A股</SelectItem>
              <SelectItem value="hk">港股</SelectItem>
              <SelectItem value="us">美股</SelectItem>
            </SelectContent>
          </Select>

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

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => {
              if (value) onViewModeChange(value as StockViewMode);
            }}
            size="sm"
            className="rounded-lg border border-border bg-background"
          >
            <ToggleGroupItem
              value="card"
              aria-label="卡片模式"
              title="卡片模式"
            >
              <Grid2X2 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label="列表模式"
              title="列表模式"
            >
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

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
