"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AlertRule, StockQuote } from "@shared/types";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Grid3x3, List, Plus } from "lucide-react";
import { GooseLogo } from "@/components/logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isAlertTriggered } from "@/lib/stocks/alert-rules";
import type { ColorMode, MarketFilter, StockViewMode } from "./stock-utils";
import { StockCard } from "./stock-card";
import { StockListItem } from "./stock-list-item";

const WATCHLIST_PAGE_SIZE = 12;

type WatchlistGridProps = {
  loading: boolean;
  visibleStocks: StockQuote[];
  watchlist: string[];
  filterTerm: string;
  colorMode: ColorMode;
  marketFilter: MarketFilter;
  onMarketFilterChange: (value: MarketFilter) => void;
  viewMode: StockViewMode;
  onViewModeChange: (value: StockViewMode) => void;
  alerts: AlertRule[];
  onOpenAddDialog: () => void;
  onOpenAlertDialog: (quote: StockQuote) => void;
  onOpenDetailsDialog: (quote: StockQuote) => void;
  onOpenDeleteDialog: (quote: StockQuote) => void;
  onVisibleSecidsChange: (secids: string[]) => void;
  onReorderWatchlist: (nextWatchlist: string[]) => void;
};

/**
 * 渲染自选监控主体区域和可排序卡片网格。
 */
export function WatchlistGrid({
  loading,
  visibleStocks,
  watchlist,
  filterTerm,
  colorMode,
  marketFilter,
  onMarketFilterChange,
  viewMode,
  onViewModeChange,
  alerts,
  onOpenAddDialog,
  onOpenAlertDialog,
  onOpenDetailsDialog,
  onOpenDeleteDialog,
  onVisibleSecidsChange,
  onReorderWatchlist,
}: WatchlistGridProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const dragDisabled = Boolean(filterTerm.trim());
  const visibleResetKey = `${filterTerm.trim()}|${marketFilter}`;
  const [visibleState, setVisibleState] = useState({
    key: visibleResetKey,
    limit: WATCHLIST_PAGE_SIZE,
  });
  const visibleLimit =
    visibleState.key === visibleResetKey
      ? visibleState.limit
      : WATCHLIST_PAGE_SIZE;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * 预处理已配置提醒的 secid 集合，避免在 map 中 O(n*m) 查找。
   */
  const alertedSecids = useMemo(
    () => new Set(alerts.map((a) => a.secid)),
    [alerts]
  );

  const triggeredSecids = useMemo(() => {
    const triggered = new Set<string>();
    for (const rule of alerts) {
      const quote = visibleStocks.find((s) => s.secid === rule.secid);
      if (quote && isAlertTriggered(rule, quote)) {
        triggered.add(rule.secid);
      }
    }
    return triggered;
  }, [alerts, visibleStocks]);

  const renderedStocks = useMemo(
    () => visibleStocks.slice(0, visibleLimit),
    [visibleStocks, visibleLimit]
  );
  const renderedSecids = useMemo(
    () => renderedStocks.map((stock) => stock.secid),
    [renderedStocks]
  );
  const renderedSecidsKey = renderedSecids.join(",");
  const hasMoreStocks = renderedStocks.length < visibleStocks.length;

  useEffect(() => {
    onVisibleSecidsChange(
      renderedSecidsKey ? renderedSecidsKey.split(",") : []
    );
  }, [onVisibleSecidsChange, renderedSecidsKey]);

  /**
   * 将拖拽结束事件转换为新的 watchlist 顺序。
   */
  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id || dragDisabled) return;

    if (
      !renderedSecids.includes(String(active.id)) ||
      !renderedSecids.includes(String(over.id))
    ) {
      return;
    }

    const oldIndex = watchlist.indexOf(String(active.id));
    const newIndex = watchlist.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    onReorderWatchlist(arrayMove(watchlist, oldIndex, newIndex));
  }

  /**
   * 追加下一批可见标的。
   */
  const handleLoadMore = useCallback((): void => {
    setVisibleState((current) =>
      current.key === visibleResetKey
        ? {
            key: visibleResetKey,
            limit: Math.min(
              current.limit + WATCHLIST_PAGE_SIZE,
              visibleStocks.length
            ),
          }
        : {
            key: visibleResetKey,
            limit: Math.min(WATCHLIST_PAGE_SIZE * 2, visibleStocks.length),
          }
    );
  }, [visibleResetKey, visibleStocks.length]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMoreStocks) return;

    /**
     * 监听底部哨兵元素，进入视口时自动追加下一批标的。
     */
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          handleLoadMore();
        }
      },
      { root: null, rootMargin: "240px 0px", threshold: 0 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [handleLoadMore, hasMoreStocks, visibleResetKey, visibleStocks.length]);

  /** 渲染头部状态栏 */
  function renderHeader() {
    return (
      <div className="flex flex-row items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">自选监控</h1>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select
            value={marketFilter}
            onValueChange={(value) =>
              onMarketFilterChange(value as MarketFilter)
            }
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-[92px] rounded-lg bg-background text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="cn">A股</SelectItem>
              <SelectItem value="hk">港股</SelectItem>
              <SelectItem value="us">美股</SelectItem>
              <SelectItem value="other">其他</SelectItem>
            </SelectContent>
          </Select>

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
              <Grid3x3 className="h-4 w-4" />
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
            type="button"
            onClick={onOpenAddDialog}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" /> 添加自选
          </button>
        </div>
      </div>
    );
  }

  /** 渲染加载中占位 */
  function renderLoading() {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin mb-3" />
        <p className="text-sm">加载行情中...</p>
      </div>
    );
  }

  /** 渲染空状态占位 */
  function renderEmpty() {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <GooseLogo className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="text-sm">未找到相关自选股</p>
        {filterTerm && (
          <button
            onClick={onOpenAddDialog}
            className="mt-4 text-xs font-medium bg-secondary text-secondary-foreground px-4 py-2 rounded-full hover:bg-secondary/80 transition-colors"
          >
            去全局搜索添加
          </button>
        )}
      </div>
    );
  }

  /** 渲染卡片/列表内容区 */
  function renderContent() {
    if (viewMode === "card") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderedStocks.map((stock) => (
            <StockCard
              key={stock.secid}
              quote={stock}
              colorMode={colorMode}
              dragDisabled={dragDisabled}
              hasAlert={alertedSecids.has(stock.secid)}
              triggered={triggeredSecids.has(stock.secid)}
              onAlert={() => onOpenAlertDialog(stock)}
              onDetails={() => onOpenDetailsDialog(stock)}
              onDelete={() => onOpenDeleteDialog(stock)}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {renderedStocks.map((stock) => (
          <StockListItem
            key={stock.secid}
            quote={stock}
            colorMode={colorMode}
            hasAlert={alertedSecids.has(stock.secid)}
            triggered={triggeredSecids.has(stock.secid)}
            dragDisabled={dragDisabled}
            onAlert={() => onOpenAlertDialog(stock)}
            onDetails={() => onOpenDetailsDialog(stock)}
            onDelete={() => onOpenDeleteDialog(stock)}
          />
        ))}
      </div>
    );
  }

  /** 渲染底部加载更多入口 */
  function renderLoadMore() {
    if (!hasMoreStocks) return null;

    return (
      <div className="mt-5 flex justify-center">
        <div ref={loadMoreRef} className="h-px w-px" aria-hidden="true" />
        <button
          type="button"
          onClick={handleLoadMore}
          className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-ring/40 hover:text-foreground"
        >
          加载更多
        </button>
      </div>
    );
  }

  /** 决定当前应渲染的内容区 */
  function renderBody() {
    if (loading && !visibleStocks.length) return renderLoading();
    if (visibleStocks.length === 0) return renderEmpty();

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={renderedSecids} strategy={rectSortingStrategy}>
          {renderContent()}
        </SortableContext>
        {renderLoadMore()}
      </DndContext>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 bg-muted/20 custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        {renderHeader()}
        {renderBody()}
      </div>
    </main>
  );
}
