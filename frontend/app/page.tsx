"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AlertRule,
  StockQuote,
  StockSearchItem,
  StockTrendPoint,
} from "@shared/types";
import {
  Activity,
  Bell,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchStockQuotes, searchStocks } from "@/lib/stocks/api";
import { getRuntimePlatform } from "@/lib/stocks/platform";
import {
  readAlertRules,
  readWatchlist,
  writeAlertRules,
  writeWatchlist,
} from "@/lib/stocks/storage";

const ALERT_LABELS: Record<AlertRule["type"], string> = {
  PRICE_ABOVE: "价格高于",
  PRICE_BELOW: "价格低于",
  CHANGE_PERCENT_ABOVE: "涨幅高于",
  CHANGE_PERCENT_BELOW: "跌幅低于",
};

/**
 * 将搜索结果转成内部 secid。
 */
function toSecid(item: StockSearchItem): string {
  return `${item.market}.${item.code}`;
}

/**
 * 格式化数字，空值显示占位。
 */
function formatNumber(value: number | null, digits = 2): string {
  return value === null || Number.isNaN(value) ? "--" : value.toFixed(digits);
}

/**
 * 格式化成交量。
 */
function formatVolume(value: number | null): string {
  if (value === null) return "--";
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`;
  return String(value);
}

/**
 * 生成 SVG 折线路径。
 */
function buildLinePath(
  points: StockTrendPoint[],
  width: number,
  height: number
): string {
  if (points.length < 2) return "";

  const values = points.map((point) => point.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point.price - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

/**
 * 判断提醒规则是否触发。
 */
function isAlertTriggered(rule: AlertRule, quote: StockQuote): boolean {
  if (rule.type === "PRICE_ABOVE")
    return quote.price !== null && quote.price >= rule.threshold;
  if (rule.type === "PRICE_BELOW")
    return quote.price !== null && quote.price <= rule.threshold;
  if (rule.type === "CHANGE_PERCENT_ABOVE") {
    return (
      quote.changePercent !== null && quote.changePercent >= rule.threshold
    );
  }

  return (
    quote.changePercent !== null &&
    quote.changePercent <= -Math.abs(rule.threshold)
  );
}

/**
 * StockGoose 应用首页。
 */
export default function HomePage() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [selectedSecid, setSelectedSecid] = useState<string>("");
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertDraft, setAlertDraft] = useState<{
    type: AlertRule["type"];
    threshold: string;
  }>({
    type: "PRICE_ABOVE",
    threshold: "",
  });

  const selectedQuote = useMemo(
    () =>
      quotes.find((quote) => quote.secid === selectedSecid) ??
      quotes[0] ??
      null,
    [quotes, selectedSecid]
  );
  const runtime = getRuntimePlatform();

  useEffect(() => {
    const storedWatchlist = readWatchlist();
    setWatchlist(storedWatchlist);
    setSelectedSecid(storedWatchlist[0] ?? "");
    setAlerts(readAlertRules());
  }, []);

  useEffect(() => {
    if (!watchlist.length) return;
    writeWatchlist(watchlist);
  }, [watchlist]);

  useEffect(() => {
    writeAlertRules(alerts);
  }, [alerts]);

  useEffect(() => {
    if (!watchlist.length) return;

    let cancelled = false;

    /**
     * 拉取并刷新自选行情。
     */
    async function refreshQuotes() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchStockQuotes(watchlist);
        if (cancelled) return;

        setQuotes(data);
        setSelectedSecid((current) => current || data[0]?.secid || "");
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "行情加载失败");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    refreshQuotes();
    const timer = window.setInterval(refreshQuotes, 45000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [watchlist]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchResults(await searchStocks(searchQuery));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "搜索失败");
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!quotes.length || !alerts.length) return;

    for (const quote of quotes) {
      for (const rule of alerts.filter((item) => item.secid === quote.secid)) {
        if (isAlertTriggered(rule, quote)) {
          toast.info(
            `${quote.name} ${ALERT_LABELS[rule.type]} ${rule.threshold}`
          );
        }
      }
    }
  }, [quotes, alerts]);

  /**
   * 添加搜索结果到自选。
   */
  function addToWatchlist(item: StockSearchItem): void {
    const secid = toSecid(item);
    setWatchlist((current) =>
      current.includes(secid) ? current : [...current, secid]
    );
    setSelectedSecid(secid);
    setSearchQuery("");
    setSearchResults([]);
  }

  /**
   * 从自选列表移除标的。
   */
  function removeFromWatchlist(secid: string): void {
    setWatchlist((current) => current.filter((item) => item !== secid));
    setAlerts((current) => current.filter((item) => item.secid !== secid));
    setQuotes((current) => current.filter((item) => item.secid !== secid));
    setSelectedSecid((current) => (current === secid ? "" : current));
  }

  /**
   * 添加当前标的提醒规则。
   */
  function addAlert(): void {
    if (!selectedQuote) return;
    const threshold = Number(alertDraft.threshold);
    if (!Number.isFinite(threshold)) {
      toast.error("请输入有效阈值");
      return;
    }

    setAlerts((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        secid: selectedQuote.secid,
        type: alertDraft.type,
        threshold,
      },
    ]);
    setAlertDraft((current) => ({ ...current, threshold: "" }));
  }

  return (
    <main className="min-h-screen bg-[#e9e4d8] text-[#171713]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-3 sm:p-5">
        <header className="grid gap-3 border-b border-[#171713]/15 pb-4 lg:grid-cols-[1fr_420px] lg:items-end">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="grid size-10 place-items-center rounded-md bg-[#171713] text-[#f8f4ea]">
                <Activity className="size-5" />
              </div>
              <div>
                <h1 className="font-serif text-3xl font-black tracking-normal sm:text-5xl">
                  StockGoose
                </h1>
                <p className="text-sm text-[#5f5a4f]">
                  多端实时自选监控 ·{" "}
                  {runtime === "web" ? "网页代理" : "运行时直连"}
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6f6a5e]" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索股票、基金或指数"
              className="h-11 rounded-md border-[#171713]/20 bg-[#f8f4ea] pl-10 text-base shadow-none focus-visible:ring-[#171713]/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#6f6a5e] hover:bg-[#171713]/10"
                aria-label="清空搜索"
              >
                <X className="size-4" />
              </button>
            )}
            {(searchResults.length > 0 || isSearching) && (
              <div className="absolute right-0 top-12 z-20 max-h-80 w-full overflow-auto rounded-md border border-[#171713]/15 bg-[#f8f4ea] shadow-xl">
                {isSearching && (
                  <div className="px-4 py-3 text-sm text-[#6f6a5e]">
                    搜索中...
                  </div>
                )}
                {searchResults.map((item) => {
                  const secid = toSecid(item);
                  const added = watchlist.includes(secid);
                  return (
                    <button
                      key={`${item.market}.${item.code}`}
                      type="button"
                      onClick={() => addToWatchlist(item)}
                      disabled={added}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#171713]/5 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <span>
                        <span className="block text-sm font-bold">
                          {item.name}
                        </span>
                        <span className="text-xs text-[#6f6a5e]">
                          {item.market}.{item.code} ·{" "}
                          {item.securityTypeName || "标的"}
                        </span>
                      </span>
                      <Plus className="size-4" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="flex items-center justify-between rounded-md border border-[#a43b2d]/30 bg-[#fff0ed] px-4 py-3 text-sm text-[#8f2e24]">
            <span>{error}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWatchlist([...watchlist])}
            >
              <RefreshCw className="size-4" />
              重试
            </Button>
          </div>
        )}

        <section className="grid flex-1 gap-4 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-md border border-[#171713]/15 bg-[#f8f4ea]">
            <div className="flex items-center justify-between border-b border-[#171713]/10 p-4">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#514d44]">
                  Watchlist
                </h2>
                <p className="text-xs text-[#777064]">
                  {watchlist.length} 个标的
                </p>
              </div>
              {isLoading && (
                <Loader2 className="size-4 animate-spin text-[#777064]" />
              )}
            </div>

            <div className="grid gap-2 p-2">
              {quotes.map((quote) => (
                <StockRow
                  key={quote.secid}
                  quote={quote}
                  active={quote.secid === selectedQuote?.secid}
                  onSelect={() => setSelectedSecid(quote.secid)}
                  onRemove={() => removeFromWatchlist(quote.secid)}
                />
              ))}
            </div>
          </aside>

          <section className="grid gap-4 xl:grid-cols-[1fr_300px]">
            <div className="rounded-md border border-[#171713]/15 bg-[#f8f4ea] p-4 sm:p-6">
              {selectedQuote ? (
                <StockDetail quote={selectedQuote} />
              ) : (
                <div className="grid min-h-96 place-items-center text-center text-[#6f6a5e]">
                  <div>
                    <Activity className="mx-auto mb-3 size-10" />
                    <p>添加一个标的开始监控</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-md border border-[#171713]/15 bg-[#171713] p-4 text-[#f8f4ea]">
              <div className="mb-4 flex items-center gap-2">
                <Bell className="size-4 text-[#d8b35f]" />
                <h2 className="font-serif text-2xl font-black">提醒</h2>
              </div>

              <div className="grid gap-2">
                <select
                  value={alertDraft.type}
                  onChange={(event) =>
                    setAlertDraft((current) => ({
                      ...current,
                      type: event.target.value as AlertRule["type"],
                    }))
                  }
                  className="h-10 rounded-md border border-white/10 bg-white/10 px-3 text-sm outline-none"
                >
                  {Object.entries(ALERT_LABELS).map(([value, label]) => (
                    <option key={value} value={value} className="bg-[#171713]">
                      {label}
                    </option>
                  ))}
                </select>
                <Input
                  value={alertDraft.threshold}
                  onChange={(event) =>
                    setAlertDraft((current) => ({
                      ...current,
                      threshold: event.target.value,
                    }))
                  }
                  placeholder="阈值"
                  type="number"
                  className="h-10 border-white/10 bg-white/10 text-[#f8f4ea] placeholder:text-white/40"
                />
                <Button
                  onClick={addAlert}
                  disabled={!selectedQuote}
                  className="bg-[#d8b35f] text-[#171713] hover:bg-[#e4c372]"
                >
                  <Plus className="size-4" />
                  添加提醒
                </Button>
              </div>

              <div className="mt-5 grid gap-2">
                {alerts
                  .filter((rule) => rule.secid === selectedQuote?.secid)
                  .map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between rounded-md bg-white/8 px-3 py-2 text-sm"
                    >
                      <span>
                        {ALERT_LABELS[rule.type]} {rule.threshold}
                        {rule.type.includes("CHANGE") ? "%" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setAlerts((current) =>
                            current.filter((item) => item.id !== rule.id)
                          )
                        }
                        className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
                        aria-label="删除提醒"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                {selectedQuote &&
                  alerts.filter((rule) => rule.secid === selectedQuote.secid)
                    .length === 0 && (
                    <p className="rounded-md border border-dashed border-white/15 px-3 py-6 text-center text-sm text-white/45">
                      当前标的暂无提醒
                    </p>
                  )}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

/**
 * 自选列表行。
 */
function StockRow({
  quote,
  active,
  onSelect,
  onRemove,
}: {
  quote: StockQuote;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const positive = (quote.change ?? 0) >= 0;

  return (
    <div
      className={cn(
        "group grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border p-3 transition",
        active
          ? "border-[#171713] bg-[#efe7d4]"
          : "border-transparent hover:bg-[#171713]/5"
      )}
    >
      <button type="button" onClick={onSelect} className="min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="truncate font-bold">{quote.name}</span>
          <Badge
            variant="outline"
            className="border-[#171713]/15 text-[#6f6a5e]"
          >
            {quote.market}.{quote.code}
          </Badge>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="font-mono text-xl font-black">
            {formatNumber(quote.price, 3)}
          </span>
          <span
            className={cn(
              "font-mono text-sm font-bold",
              positive ? "text-[#0f7a4f]" : "text-[#b83b31]"
            )}
          >
            {positive ? "+" : ""}
            {formatNumber(quote.changePercent)}%
          </span>
        </div>
      </button>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-[#777064] opacity-0 hover:bg-[#171713]/10 group-hover:opacity-100"
          aria-label="移除自选"
        >
          <Trash2 className="size-4" />
        </button>
        <ChevronRight className="size-4 text-[#777064]" />
      </div>
    </div>
  );
}

/**
 * 选中标的详情。
 */
function StockDetail({ quote }: { quote: StockQuote }) {
  const positive = (quote.change ?? 0) >= 0;
  const linePath = buildLinePath(quote.trend, 760, 260);
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 border-b border-[#171713]/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-4xl font-black tracking-normal">
              {quote.name}
            </h2>
            <Badge className="bg-[#171713] text-[#f8f4ea]">
              {quote.market}.{quote.code}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[#6f6a5e]">
            更新于 {quote.updatedAt ?? "--"}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <div className="font-mono text-5xl font-black">
            {formatNumber(quote.price, 3)}
          </div>
          <div
            className={cn(
              "mt-1 flex items-center gap-2 font-mono font-bold sm:justify-end",
              positive ? "text-[#0f7a4f]" : "text-[#b83b31]"
            )}
          >
            <Icon className="size-4" />
            {positive ? "+" : ""}
            {formatNumber(quote.change, 3)} / {positive ? "+" : ""}
            {formatNumber(quote.changePercent)}%
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="昨收" value={formatNumber(quote.previousClose, 3)} />
        <Metric label="成交量" value={formatVolume(quote.volume)} />
        <Metric label="分时点" value={String(quote.trend.length)} />
        <Metric label="来源" value="Eastmoney" />
      </div>

      <div className="relative overflow-hidden rounded-md border border-[#171713]/10 bg-[#efe7d4] p-3">
        <svg viewBox="0 0 760 260" className="h-72 w-full overflow-visible">
          <defs>
            <linearGradient id="stock-line" x1="0" x2="1" y1="0" y2="0">
              <stop
                offset="0%"
                stopColor={positive ? "#0f7a4f" : "#b83b31"}
                stopOpacity="0.55"
              />
              <stop
                offset="100%"
                stopColor={positive ? "#0f7a4f" : "#b83b31"}
              />
            </linearGradient>
          </defs>
          <path
            d={linePath}
            fill="none"
            stroke="url(#stock-line)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
        </svg>
        {quote.trend.length < 2 && (
          <div className="absolute inset-0 grid place-items-center text-sm text-[#6f6a5e]">
            暂无分时数据
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 详情指标块。
 */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#171713]/10 bg-[#fffaf0] p-3">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#777064]">
        {label}
      </div>
      <div className="mt-2 font-mono text-lg font-black">{value}</div>
    </div>
  );
}
