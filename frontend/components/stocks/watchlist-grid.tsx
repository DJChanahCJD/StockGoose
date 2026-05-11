"use client";

import type { StockQuote } from "@shared/types";
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
import { Plus } from "lucide-react";
import { GooseLogo } from "@/components/logo";
import type { ColorMode } from "./stock-utils";
import { formatUpdateTime } from "./stock-utils";
import { StockCard } from "./stock-card";

type WatchlistGridProps = {
  loading: boolean;
  visibleStocks: StockQuote[];
  watchlist: string[];
  filterTerm: string;
  runtimeLabel: string;
  lastRefreshAt: string | null;
  colorMode: ColorMode;
  onOpenAddDialog: () => void;
  onOpenAlertDialog: (quote: StockQuote) => void;
  onOpenDetailsDialog: (quote: StockQuote) => void;
  onOpenDeleteDialog: (quote: StockQuote) => void;
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
  runtimeLabel,
  lastRefreshAt,
  colorMode,
  onOpenAddDialog,
  onOpenAlertDialog,
  onOpenDetailsDialog,
  onOpenDeleteDialog,
  onReorderWatchlist,
}: WatchlistGridProps) {
  const dragDisabled = Boolean(filterTerm.trim());
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
   * 将拖拽结束事件转换为新的 watchlist 顺序。
   */
  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id || dragDisabled) return;

    const oldIndex = watchlist.indexOf(String(active.id));
    const newIndex = watchlist.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    onReorderWatchlist(arrayMove(watchlist, oldIndex, newIndex));
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 bg-muted/20 custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">自选监控</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {runtimeLabel} · {watchlist.length} 个标的 · 最近刷新{" "}
              {formatUpdateTime(lastRefreshAt)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
              ● 实时更新中
            </span>
            <button
              onClick={onOpenAddDialog}
              className="flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 px-3 py-1.5 rounded-full transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> 添加自选
            </button>
          </div>
        </div>

        {loading && !visibleStocks.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin mb-3" />
            <p className="text-sm">加载行情中...</p>
          </div>
        ) : visibleStocks.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={watchlist} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleStocks.map((stock) => (
                  <StockCard
                    key={stock.secid}
                    quote={stock}
                    colorMode={colorMode}
                    dragDisabled={dragDisabled}
                    onAlert={() => onOpenAlertDialog(stock)}
                    onDetails={() => onOpenDetailsDialog(stock)}
                    onDelete={() => onOpenDeleteDialog(stock)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
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
        )}
      </div>
    </main>
  );
}
