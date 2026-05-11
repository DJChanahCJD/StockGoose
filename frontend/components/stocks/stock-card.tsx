"use client";

import type { CSSProperties } from "react";
import type { StockQuote } from "@shared/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BellRing, Clock3, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useStockQuoteTrend } from "@/hooks/use-stock-quote-trend";
import type { ColorMode } from "./stock-utils";
import { formatNumber, formatUpdateTime } from "./stock-utils";
import { StockContextMenuContent } from "./stock-context-menu";

type StockCardProps = {
  quote: StockQuote;
  colorMode: ColorMode;
  dragDisabled: boolean;
  hasAlert: boolean;
  triggered: boolean;
  onAlert: () => void;
  onDetails: () => void;
  onDelete: () => void;
};

/**
 * 渲染单个可排序标的卡片和右键/长按菜单。
 */
export function StockCard({
  quote,
  colorMode,
  dragDisabled,
  hasAlert,
  triggered,
  onAlert,
  onDetails,
  onDelete,
}: StockCardProps) {
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
              "group relative bg-card text-card-foreground rounded-2xl p-5 shadow-sm border transition-all duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring hover:scale-[1.02]",
              triggered
                ? "border-warning/40 ring-1 ring-warning/20 hover:shadow-md"
                : "border-border hover:shadow-md hover:border-ring/40"
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 min-w-0">
                  <h2
                    className="text-base font-bold tracking-tight truncate max-w-[140px]"
                    title={quote.name}
                  >
                    {quote.name}
                  </h2>
                  {hasAlert && (
                    <BellRing
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        triggered ? "text-warning" : "text-muted-foreground"
                      )}
                    />
                  )}
                </div>
                <div className="flex items-center mt-1.5">
                  <span className="text-[11px] font-mono font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md border border-border/50">
                    {quote.code}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2 py-1",
                    bgLightClass
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", colorClass)} />
                  <span className={cn("text-xs font-bold", colorClass)}>
                    {quote.changePercent === null
                      ? "--"
                      : `${quote.changePercent >= 0 ? "+" : ""}${
                          quote.changePercent
                        }%`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between mt-6">
              <div>
                <div className="font-mono text-3xl font-semibold tracking-tight">
                  {formatNumber(quote.price, 2)}
                </div>
                <div
                  className={cn(
                    "mt-1 font-mono text-xs font-medium",
                    colorClass
                  )}
                >
                  {quote.change === null
                    ? "--"
                    : `${quote.change >= 0 ? "+" : ""}${quote.change.toFixed(
                        2
                      )}`}
                </div>
              </div>

              <div className="pb-1">
                <svg
                  viewBox="0 -10 100 120"
                  className="h-12 w-32 overflow-visible opacity-80"
                  preserveAspectRatio="none"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                    className={colorClass}
                  />
                </svg>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Clock3 className="w-3 h-3" />
              <span>{formatUpdateTime(quote.updatedAt)}</span>
            </div>

            <button
              ref={setActivatorNodeRef}
              type="button"
              onClick={(event) => event.stopPropagation()}
              className={cn(
                "absolute top-4 left-1/2 -translate-x-1/2 rounded-md p-1 transition-opacity focus-visible:ring-2 focus-visible:ring-ring",
                dragDisabled
                  ? "cursor-not-allowed opacity-20"
                  : "cursor-grab opacity-40 hover:opacity-100 active:cursor-grabbing"
              )}
              title={dragDisabled ? "过滤时不可排序" : "拖拽排序"}
              aria-label={dragDisabled ? "过滤时不可排序" : "拖拽排序"}
              disabled={dragDisabled}
              {...attributes}
              {...listeners}
            >
              <GripHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </ContextMenuTrigger>
        <StockContextMenuContent
          onAlert={onAlert}
          onDetails={onDetails}
          onDelete={onDelete}
        />
      </ContextMenu>
    </div>
  );
}
