"use client";

import type { CSSProperties } from "react";
import type { StockQuote } from "@/lib/stocks/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BellRing, GripVertical } from "lucide-react";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useStockQuoteTrend } from "@/hooks/use-stock-quote-trend";
import type { ColorMode } from "./stock-utils";
import { formatNumber } from "./stock-utils";
import { StockContextMenuContent } from "./stock-context-menu";

type StockListItemProps = {
  quote: StockQuote;
  colorMode: ColorMode;
  hasAlert: boolean;
  triggered: boolean;
  dragDisabled: boolean;
  onAlert: () => void;
  onDetails: () => void;
  onDelete: () => void;
};

/**
 * 渲染紧凑列表模式下的单个可排序标的。
 */
export function StockListItem({
  quote,
  colorMode,
  hasAlert,
  triggered,
  dragDisabled,
  onAlert,
  onDetails,
  onDelete,
}: StockListItemProps) {
  const { colorClass, bgLightClass, isUp, Icon, points } = useStockQuoteTrend(
    quote,
    colorMode
  );
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: quote.secid, disabled: dragDisabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "relative z-20 opacity-80")}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onClick={onDetails}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onDetails();
              }
            }}
            className={cn(
              "group grid min-h-16 grid-cols-[22px_minmax(0,1fr)_48px_64px_80px] items-center gap-2 rounded-xl border bg-card px-3 py-2 text-card-foreground shadow-sm transition-all hover:border-ring/40 hover:shadow-md active:border-ring/40 active:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
              triggered ? "border-warning/40 bg-warning/3" : "border-border"
            )}
          >
            <button
              ref={setActivatorNodeRef}
              type="button"
              onClick={(event) => event.stopPropagation()}
              className={cn(
                "flex h-8 w-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                dragDisabled
                  ? "cursor-not-allowed text-muted-foreground/30"
                  : "cursor-grab text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary active:text-foreground active:cursor-grabbing"
              )}
              title={dragDisabled ? "过滤时不可排序" : "拖拽排序"}
              aria-label={dragDisabled ? "过滤时不可排序" : "拖拽排序"}
              disabled={dragDisabled}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1">
                <span className="truncate text-sm font-semibold">
                  {quote.name}
                </span>
                {hasAlert && (
                  <BellRing
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      triggered ? "text-warning" : "text-muted-foreground"
                    )}
                  />
                )}
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                {quote.code}
              </div>
            </div>

            <svg
              viewBox="0 -8 100 116"
              className="h-7 w-full overflow-visible opacity-80"
              preserveAspectRatio="none"
            >
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className={colorClass}
              />
            </svg>

            <div className="text-right font-mono text-sm font-medium">
              {formatNumber(quote.price, 2)}
            </div>

            <div className="flex justify-end">
              <div
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-md",
                  bgLightClass
                )}
              >
                <span className={cn("font-mono font-bold", colorClass)}>
                  {quote.changePercent === null
                    ? "--"
                    : `${quote.changePercent >= 0 ? "+" : ""}${
                        quote.changePercent
                      }%`}
                </span>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <StockContextMenuContent onAlert={onAlert} onDelete={onDelete} />
      </ContextMenu>
    </div>
  );
}
