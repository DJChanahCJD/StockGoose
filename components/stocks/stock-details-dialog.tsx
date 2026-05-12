"use client";

import { useEffect, useMemo, useState } from "react";
import type { PointerEvent } from "react";
import type {
  StockHistoryPoint,
  StockHistoryRange,
  StockQuote,
} from "@/lib/stocks/types";
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
  value: DetailsRange;
  label: string;
};

type DetailsRange = "intraday" | StockHistoryRange;

type TrendChartPoint = {
  label: string;
  price: number;
  changePercent: number;
};

const RANGE_OPTIONS: RangeOption[] = [
  { value: "intraday", label: "分时" },
  { value: "1m", label: "近1月" },
  { value: "3m", label: "近3月" },
  { value: "6m", label: "近6月" },
  { value: "1y", label: "近1年" },
  { value: "3y", label: "近3年" },
  { value: "5y", label: "近5年" },
  { value: "10y", label: "近10年" },
  { value: "all", label: "全部" },
];

const CHART_X_MIN = 2;
const CHART_X_RANGE = 96;

export function StockDetailsDialog({
  quote,
  colorMode,
  onClose,
}: StockDetailsDialogProps) {
  const secid = quote?.secid ?? null;
  const [range, setRange] = useState<DetailsRange>("intraday");
  const [history, setHistory] = useState<StockHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { colorClass } = quote
    ? getQuoteTone(quote, colorMode)
    : { colorClass: "text-success" };
  const quoteCode = quote?.code ?? null;
  const quoteMarket = quote?.market ?? null;

  const externalLinks = useMemo<ExternalLinkType[]>(() => {
    if (!quoteCode || !quoteMarket) return [];
    return generateExternalLinks(quoteCode, quoteMarket);
  }, [quoteCode, quoteMarket]);

  useEffect(() => {
    setHistory([]);
    setError(null);
  }, [secid]);

  useEffect(() => {
    if (!secid || range === "intraday") {
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    const currentSecid = secid;
    const currentRange = range;

    async function loadHistory(): Promise<void> {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchStockHistory(currentSecid, currentRange);
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
  }, [secid, range, reloadKey]);

  const chartPoints = useMemo(() => {
    if (!quote) return [];
    if (range === "intraday") return buildIntradayChartPoints(quote);
    return history.map((point) => ({
      label: point.date,
      price: point.close,
      changePercent: point.changePercent,
    }));
  }, [history, quote, range]);

  return (
    <Dialog open={Boolean(quote)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
        {quote && (
          <>
            <DialogHeader>
              <DialogTitle className="flex min-w-0 flex-wrap items-center gap-2 pr-6 text-left">
                <span className="min-w-0 truncate">{quote.name}</span>
                <Badge variant="secondary" className="shrink-0 font-mono">
                  {quote.code}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="min-w-0">
                {/* 优化点：更新时间与“当前价”融合在同一行 */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>当前价</span>
                  <span className="h-3 w-px bg-border/80"></span>
                  <span className="font-mono text-xs tracking-tight opacity-70 sm:text-xs">
                    {formatUpdateTime(quote.updatedAt)}
                  </span>
                </div>

                <div className="mt-1 flex min-w-0 items-baseline gap-3">
                  <span className="min-w-0 font-mono text-3xl font-semibold sm:text-4xl">
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

            <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
              {range === "intraday" && chartPoints.length > 1 ? (
                <TrendChart points={chartPoints} colorMode={colorMode} />
              ) : range === "intraday" ? (
                <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground sm:h-[224px]">
                  分时走势暂不可用
                </div>
              ) : loading && history.length <= 1 ? (
                <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground sm:h-[224px]">
                  加载历史走势中...
                </div>
              ) : error && history.length <= 1 ? (
                <HistoryError
                  message={error}
                  onRetry={() => setReloadKey((current) => current + 1)}
                />
              ) : history.length > 1 ? (
                <div className="relative min-w-0 overflow-hidden">
                  <TrendChart points={chartPoints} colorMode={colorMode} />
                  {loading && <HistoryLoadingBadge />}
                  {error && (
                    <HistoryInlineError
                      message={error}
                      onRetry={() => setReloadKey((current) => current + 1)}
                    />
                  )}
                </div>
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

/**
 * 渲染历史图保留期间的轻量加载提示。
 */
function HistoryLoadingBadge() {
  return (
    <div className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
      <RefreshCw className="h-3 w-3 animate-spin" />
      更新中
    </div>
  );
}

/**
 * 渲染保留旧历史图时的轻量错误提示。
 */
function HistoryInlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 font-medium text-foreground hover:text-primary"
      >
        重试
      </button>
    </div>
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

/**
 * 渲染分时或历史区间的统一趋势图。
 */
function TrendChart({
  points,
  colorMode,
}: {
  points: TrendChartPoint[];
  colorMode: ColorMode;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { coordinates, path, zeroY } = useMemo(() => {
    const values = points.map((p) => p.changePercent);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 0);
    const rangeVal = maxVal - minVal || 1;

    const getX = (index: number) =>
      CHART_X_MIN + (index / (points.length - 1)) * CHART_X_RANGE;
    const getY = (val: number) => 95 - ((val - minVal) / rangeVal) * 90;
    const chartCoordinates = points.map((point, index) => ({
      x: getX(index),
      y: getY(point.changePercent),
    }));

    const pathString = chartCoordinates
      .map((point, index) => {
        return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      })
      .join(" ");

    return { coordinates: chartCoordinates, path: pathString, zeroY: getY(0) };
  }, [points]);

  const activeIndex = hoverIndex ?? points.length - 1;
  const active = points[activeIndex];
  const activePoint = coordinates[activeIndex];

  const isUp = active.changePercent >= 0;
  const isRedTone = colorMode === "cn" ? isUp : !isUp;
  const toneTextClass = isRedTone ? "text-danger" : "text-success";

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
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
            {active.label}
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
          <div className="text-xs font-medium text-muted-foreground">价格</div>
          <div className="mt-1 font-mono text-base font-semibold">
            {formatNumber(active.price, 2)}
          </div>
        </div>
      </div>

      <div
        className="relative h-40 w-full min-w-0 cursor-crosshair touch-none overflow-hidden sm:h-56"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
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
            x1={activePoint.x}
            x2={activePoint.x}
            y1="0"
            y2="100"
            stroke="currentColor"
            strokeDasharray="2 3"
            className="text-muted-foreground/50"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow-sm"
          style={{ left: `${activePoint.x}%`, top: `${activePoint.y}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 将分时价格转换为统一趋势图数据。
 */
function buildIntradayChartPoints(quote: StockQuote): TrendChartPoint[] {
  const previousClose = quote.previousClose;
  if (!previousClose) return [];

  return quote.trend.map((point) => ({
    label: point.time,
    price: point.price,
    changePercent: Number(((point.price / previousClose - 1) * 100).toFixed(2)),
  }));
}
