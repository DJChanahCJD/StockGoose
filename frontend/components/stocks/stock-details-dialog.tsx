"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  StockHistoryPoint,
  StockHistoryRange,
  StockQuote,
} from "@shared/types";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchStockHistory } from "@/lib/stocks/api";
import {
  generateExternalLinks,
  type ExternalLink as ExternalLinkType,
} from "@/lib/stocks/external-links";
import { cn } from "@/lib/utils";
import type { ColorMode } from "./stock-utils";
import { formatNumber, formatUpdateTime, getQuoteTone } from "./stock-utils";

type StockDetailsDialogProps = {
  quote: StockQuote | null;
  colorMode: ColorMode;
  onClose: () => void;
};

type RangeOption = {
  value: StockHistoryRange;
  label: string;
};

const RANGE_OPTIONS: RangeOption[] = [
  { value: "1m", label: "近1月" },
  { value: "3m", label: "近3月" },
  { value: "6m", label: "近6月" },
  { value: "1y", label: "近1年" },
  { value: "3y", label: "近3年" },
  { value: "5y", label: "近5年" },
  { value: "10y", label: "近10年" },
  { value: "all", label: "全部" },
];

export function StockDetailsDialog({
  quote,
  colorMode,
  onClose,
}: StockDetailsDialogProps) {
  const [range, setRange] = useState<StockHistoryRange>("1m");
  const [history, setHistory] = useState<StockHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { colorClass } = quote
    ? getQuoteTone(quote, colorMode)
    : { colorClass: "text-success" };

  const externalLinks = useMemo<ExternalLinkType[]>(() => {
    if (!quote) return [];
    return generateExternalLinks(quote.code, quote.market);
  }, [quote]);

  useEffect(() => {
    if (!quote) return;
    let cancelled = false;
    const secid = quote.secid;

    async function loadHistory(): Promise<void> {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchStockHistory(secid, range);
        if (!cancelled) setHistory(data);
      } catch (loadError) {
        if (!cancelled) {
          setHistory([]);
          setError(
            loadError instanceof Error ? loadError.message : "历史走势暂不可用"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [quote, range, reloadKey]);

  return (
    <Dialog open={Boolean(quote)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-3xl">
        {quote && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {quote.name}
                <Badge variant="secondary" className="font-mono">
                  {quote.code}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div>
                {/* 优化点：更新时间与“当前价”融合在同一行 */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>当前价</span>
                  <span className="h-3 w-px bg-border/80"></span>
                  <span className="font-mono text-xs tracking-tight opacity-70 sm:text-xs">
                    {formatUpdateTime(quote.updatedAt)}
                  </span>
                </div>

                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-mono text-3xl font-semibold sm:text-4xl">
                    {formatNumber(quote.price, 2)}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-sm font-medium sm:text-base",
                      colorClass
                    )}
                  >
                    {quote.changePercent === null
                      ? "--"
                      : `${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent}%`}
                  </span>
                </div>

                {externalLinks.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {externalLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-xs text-primary transition-colors hover:text-primary/80"
                      >
                        {link.name}
                        <ExternalLink className="size-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
              {loading ? (
                <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground sm:h-[224px]">
                  加载历史走势中...
                </div>
              ) : error ? (
                <HistoryError
                  message={error}
                  onRetry={() => setReloadKey((current) => current + 1)}
                />
              ) : history.length > 1 ? (
                <HistoryChart points={history} colorMode={colorMode} />
              ) : (
                <HistoryError
                  message="历史走势暂不可用"
                  onRetry={() => setReloadKey((current) => current + 1)}
                />
              )}

              <div className="mt-3 -mx-3 -mb-3 border-t border-border bg-muted/30 px-3 pb-3 pt-2 sm:-mx-4 sm:-mb-4 sm:px-4 sm:pb-4">
                <div className="flex w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {RANGE_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRange(item.value)}
                      className={cn(
                        "flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-all sm:flex-1",
                        range === item.value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HistoryError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-[160px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground sm:h-[224px]">
      <div>{message}</div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        重试
      </button>
    </div>
  );
}

function HistoryChart({
  points,
  colorMode,
}: {
  points: StockHistoryPoint[];
  colorMode: ColorMode;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { path, min, range, zeroY } = useMemo(() => {
    const values = points.map((p) => p.changePercent);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 0);
    const rangeVal = maxVal - minVal || 1;

    const getY = (val: number) => 95 - ((val - minVal) / rangeVal) * 90;

    const pathString = points
      .map((point, index) => {
        const x = (index / (points.length - 1)) * 100;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${getY(point.changePercent).toFixed(2)}`;
      })
      .join(" ");

    return { path: pathString, min: minVal, range: rangeVal, zeroY: getY(0) };
  }, [points]);

  const activeIndex = hoverIndex ?? points.length - 1;
  const active = points[activeIndex];
  const activeX = (activeIndex / (points.length - 1)) * 100;

  const isUp = active.changePercent >= 0;
  const isRedTone = colorMode === "cn" ? isUp : !isUp;
  const toneTextClass = isRedTone ? "text-danger" : "text-success";

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width)
    );
    setHoverIndex(Math.round(ratio * (points.length - 1)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground">
            {active.date}
          </div>
          <div
            className={cn(
              "mt-1 font-mono text-xl font-bold sm:text-2xl",
              toneTextClass
            )}
          >
            {isUp ? "+" : ""}
            {active.changePercent.toFixed(2)}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-muted-foreground">
            收盘价
          </div>
          <div className="mt-1 font-mono text-base font-semibold">
            {formatNumber(active.close, 2)}
          </div>
        </div>
      </div>

      <div
        className="relative h-40 w-full cursor-crosshair touch-none sm:h-56"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full overflow-visible pointer-events-none"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            x2="100"
            y1={zeroY}
            y2={zeroY}
            stroke="currentColor"
            strokeDasharray="3 3"
            className="text-border"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={toneTextClass}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={activeX}
            x2={activeX}
            y1="0"
            y2="100"
            stroke="currentColor"
            strokeDasharray="2 3"
            className="text-muted-foreground/50"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}
