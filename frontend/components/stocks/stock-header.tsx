"use client";

import { useState, type ChangeEvent } from "react";
import {
  Database,
  FileInput,
  FileOutput,
  Moon,
  Palette,
  Search,
  Settings2,
  Sun,
  TrendingUp,
  X,
} from "lucide-react";
import { GooseLogo } from "@/components/logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import type { ColorMode } from "./stock-utils";

type StockHeaderProps = {
  filterTerm: string;
  onFilterChange: (value: string) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
};

/**
 * 渲染自选页顶部栏和全局列表过滤控件。
 */
export function StockHeader({
  filterTerm,
  onFilterChange,
  colorMode,
  onColorModeChange,
  onExportData,
  onImportData,
}: StockHeaderProps) {
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  /**
   * 清空当前自选筛选词并关闭移动端搜索栏。
   */
  function clearSearch(): void {
    onFilterChange("");
    if (isMobile) setMobileSearchOpen(false);
  }

  /**
   * 打开指定的隐藏文件选择器。
   */
  function openImportPicker(inputId: string): void {
    document.getElementById(inputId)?.click();
  }

  /**
   * 将文件选择结果传给页面层处理，并清空 input 以支持重复导入同一文件。
   */
  function handleImportFile(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) onImportData(file);
    event.target.value = "";
  }

  /**
   * 渲染股票名称与代码筛选输入框。
   */
  function renderSearchInput(className = "") {
    return (
      <div className={`relative group ${className}`}>
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={filterTerm}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="搜索自选代码或名称..."
          className="w-full bg-background border border-input rounded-lg py-1.5 pl-9 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-muted-foreground text-foreground"
          autoFocus={isMobile}
        />
        {(filterTerm || isMobile) && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={filterTerm ? "清空搜索" : "关闭搜索"}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  /**
   * 渲染隐藏的备份文件选择器。
   */
  function renderImportInput(id: string) {
    return (
      <input
        id={id}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />
    );
  }

  /**
   * 渲染桌面端数据导入导出菜单。
   */
  function renderDesktopDataMenu() {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="hidden md:inline-flex p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="数据导入导出"
            aria-label="数据导入导出"
          >
            <Database className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <label htmlFor="stock-data-import" className="cursor-pointer">
              <FileInput className="h-4 w-4" />
              导入备份
            </label>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportData}>
            <FileOutput className="h-4 w-4" />
            导出备份
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  /**
   * 渲染移动端外观设置抽屉。
   */
  function renderMobileSettings() {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            aria-label="打开外观设置"
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-sm">显示设置</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-5 space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                数据
              </div>
              <ToggleGroup
                type="single"
                size="sm"
                className="grid w-full grid-cols-2 rounded-lg border border-border bg-background"
              >
                <ToggleGroupItem
                  value="import"
                  aria-label="导入备份"
                  onClick={() => openImportPicker("stock-data-import-mobile")}
                >
                  <FileInput className="h-4 w-4" />
                  导入
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="export"
                  aria-label="导出备份"
                  onClick={onExportData}
                >
                  <FileOutput className="h-4 w-4" />
                  导出
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                涨跌颜色
              </div>
              <ToggleGroup
                type="single"
                value={colorMode}
                onValueChange={(value) => {
                  if (value) onColorModeChange(value as ColorMode);
                }}
                size="sm"
                className="grid w-full grid-cols-2 rounded-lg border border-border bg-background"
              >
                <ToggleGroupItem value="cn" aria-label="红涨绿跌">
                  <TrendingUp
                    className="h-5 w-5 text-red-500"
                    strokeWidth={2.5}
                  />
                  红涨绿跌
                </ToggleGroupItem>
                <ToggleGroupItem value="us" aria-label="绿涨红跌">
                  <TrendingUp
                    className="h-5 w-5 text-green-500"
                    strokeWidth={2.5}
                  />
                  绿涨红跌
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                主题
              </div>
              <ToggleGroup
                type="single"
                value={theme}
                onValueChange={(value) => {
                  if (value) setTheme(value);
                }}
                size="sm"
                className="grid w-full grid-cols-2 rounded-lg border border-border bg-background"
              >
                <ToggleGroupItem value="light" aria-label="浅色模式">
                  <Sun className="h-4 w-4" />
                  浅色
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" aria-label="深色模式">
                  <Moon className="h-4 w-4" />
                  深色
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <header
      className="min-h-14 bg-card border-b border-border select-none shrink-0 z-10"
      data-tauri-drag-region
    >
      <div className="max-w-7xl mx-auto w-full min-h-14 px-6 flex items-center justify-between gap-3 pointer-events-none">
        <div
          className="flex items-center gap-3 text-foreground cursor-pointer"
          onClick={() => window.location.reload()}
        >
          <GooseLogo className="w-5 h-5" />
          <h1 className="font-bold tracking-tight text-md">StockGoose</h1>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileSearchOpen((open) => !open)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="搜索自选"
            >
              <Search className="w-4 h-4" />
            </Button>
          ) : (
            renderSearchInput("w-64")
          )}

          {renderDesktopDataMenu()}

          <button
            type="button"
            onClick={() => onColorModeChange(colorMode === "us" ? "cn" : "us")}
            className="hidden md:inline-flex p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={
              colorMode === "us"
                ? "切换为红涨绿跌 (国内市场)"
                : "切换为绿涨红跌 (国外市场)"
            }
          >
            <Palette className="w-4 h-4" />
          </button>
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <div className="md:hidden">{renderMobileSettings()}</div>
        </div>
      </div>
      {renderImportInput("stock-data-import")}
      {renderImportInput("stock-data-import-mobile")}
      {isMobile && mobileSearchOpen && (
        <div className="px-6 pb-3 pointer-events-auto">
          {renderSearchInput("w-full")}
        </div>
      )}
    </header>
  );
}
