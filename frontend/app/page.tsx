"use client";

import { useEffect, useMemo, useState } from "react";
import type { AlertRule, StockQuote, StockSearchItem } from "@shared/types";
import {
  AlertCircle,
  Bell,
  Clock3,
  GripHorizontal,
  Palette,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { GooseLogo } from "@/components/logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { searchStocks } from "@/lib/stocks/api";
import { getRuntimePlatform } from "@/lib/stocks/platform";
import { toSecid, useStockStore } from "@/stores";

// ==========================================
// Types & Constants & Utils
// ==========================================
type AlertDraft = { type: AlertRule["type"]; threshold: string };
const ALERT_LABELS: Record<AlertRule["type"], string> = {
  PRICE_ABOVE: "价格高于",
  PRICE_BELOW: "价格低于",
  CHANGE_PERCENT_ABOVE: "涨幅高于",
  CHANGE_PERCENT_BELOW: "跌幅低于",
};
const ALERT_OPTIONS: Array<{ value: AlertRule["type"]; label: string }> = [
  { value: "PRICE_ABOVE", label: "价格高于" },
  { value: "PRICE_BELOW", label: "价格低于" },
  { value: "CHANGE_PERCENT_ABOVE", label: "日涨幅大于(%)" },
  { value: "CHANGE_PERCENT_BELOW", label: "日跌幅大于(%)" },
];

function buildFallbackTrend(price: number): number[] {
  let c = price;
  return Array.from({ length: 20 }, () => {
    c = Math.max(0.01, c + c * 0.01 * (Math.random() - 0.5));
    return Number(c.toFixed(2));
  });
}
function formatNumber(value: number | null, digits = 2): string {
  return value === null || Number.isNaN(value) ? "--" : value.toFixed(digits);
}
function buildPolylinePoints(data: number[]): string {
  if (data.length < 2) return "";
  const min = Math.min(...data),
    max = Math.max(...data),
    range = max - min || 1;
  return data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`
    )
    .join(" ");
}
function isAlertTriggered(rule: AlertRule, quote: StockQuote): boolean {
  if (rule.type === "PRICE_ABOVE")
    return quote.price !== null && quote.price >= rule.threshold;
  if (rule.type === "PRICE_BELOW")
    return quote.price !== null && quote.price <= rule.threshold;
  if (rule.type === "CHANGE_PERCENT_ABOVE")
    return (
      quote.changePercent !== null && quote.changePercent >= rule.threshold
    );
  return (
    quote.changePercent !== null &&
    quote.changePercent <= -Math.abs(rule.threshold)
  );
}
function getDisplayName(quote: StockQuote): string {
  return quote.name || quote.code;
}
function formatUpdateTime(value: string | null): string {
  if (!value) return "等待数据";
  const p = new Date(value);
  return Number.isNaN(p.getTime())
    ? value
    : p.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
}

// ==========================================
// Components
// ==========================================

function Header({
  filterTerm,
  onFilterChange,
  colorMode,
  onColorModeChange,
}: {
  filterTerm: string;
  onFilterChange: (val: string) => void;
  colorMode: "us" | "cn";
  onColorModeChange: (m: "us" | "cn") => void;
}) {
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
              onChange={(e) => onFilterChange(e.target.value)}
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

function StockCard({
  quote,
  colorMode,
  onAlert,
  onRemove,
}: {
  quote: StockQuote;
  colorMode: "us" | "cn";
  onAlert: () => void;
  onRemove: () => void;
}) {
  const isUp = (quote.change ?? 0) >= 0;
  const [fallbackPoints, setFallbackPoints] = useState("");
  const trend = useMemo(
    () => (quote.trend.length ? quote.trend.map((item) => item.price) : null),
    [quote.trend]
  );

  useEffect(() => {
    if (!trend) {
      setFallbackPoints(
        buildPolylinePoints(buildFallbackTrend(quote.price ?? 1))
      );
    }
  }, [trend, quote.price]);

  const points = trend ? buildPolylinePoints(trend) : fallbackPoints;

  const colorClass =
    colorMode === "cn"
      ? isUp
        ? "text-danger"
        : "text-success"
      : isUp
        ? "text-success"
        : "text-danger";

  const bgLightClass =
    colorMode === "cn"
      ? isUp
        ? "bg-danger/10"
        : "bg-success/10"
      : isUp
        ? "bg-success/10"
        : "bg-danger/10";

  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <div className="group relative bg-card text-card-foreground rounded-2xl p-5 shadow-sm border border-border hover:shadow-md hover:border-ring/40 transition-all duration-300 cursor-default">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2
            className="text-base font-bold tracking-tight truncate max-w-[140px]"
            title={quote.name}
          >
            {quote.name}
          </h2>
          <div className="flex items-center mt-1.5">
            <span className="text-[11px] font-mono font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md border border-border/50">
              {quote.code}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAlert}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
            title="设置提醒"
          >
            <Bell className="w-4 h-4" />
          </button>
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
                : `${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent}%`}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between mt-6">
        <div>
          <div className="font-mono text-3xl font-semibold tracking-tight">
            {formatNumber(quote.price, 2)}
          </div>
          <div className={cn("mt-1 font-mono text-xs font-medium", colorClass)}>
            {quote.change === null
              ? "--"
              : `${quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)}`}
          </div>
        </div>

        <div className="pb-1">
          <svg
            viewBox="0 -10 100 120"
            className="h-8 w-20 overflow-visible opacity-80"
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
        <Clock3 className="w-3.5 h-3.5" />
        <span>行情时间 {formatUpdateTime(quote.updatedAt)}</span>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
        <GripHorizontal className="w-4 h-4 text-muted-foreground/40" />
      </div>

      <button
        onClick={onRemove}
        className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        title="移除自选"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function AddStockModal({
  isOpen,
  onClose,
  searchTerm,
  onSearchChange,
  isSearching,
  searchResults,
  watchlist,
  onAdd,
}: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h3 className="font-bold">搜索并添加股票</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索代码或名称 (如: AAPL)..."
              className="w-full bg-background border border-input rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-ring transition-all outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="overflow-y-auto p-2 min-h-[100px]">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              搜索中...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              输入关键词开始搜索
            </div>
          ) : (
            searchResults.map((item: any) => {
              const secid = toSecid(item);
              const added = watchlist.includes(secid);
              return (
                <div
                  key={secid}
                  className="flex items-center justify-between p-3 hover:bg-accent rounded-xl transition-colors"
                >
                  <div>
                    <div className="font-bold text-foreground">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.market}.{item.code}
                    </div>
                  </div>
                  <button
                    disabled={added}
                    onClick={() => onAdd(item)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      added
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    )}
                  >
                    {added ? "已在自选" : "加入自选"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function AlertModal({
  quote,
  onClose,
  draft,
  onDraftChange,
  onAddAlert,
  alerts,
  onRemoveAlert,
}: any) {
  if (!quote) return null;
  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
          <div>
            <h3 className="font-bold">设置提醒</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {quote.code} - 当前: {formatNumber(quote.price, 2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex gap-2">
            <select
              value={draft.type}
              onChange={(e) =>
                onDraftChange({ ...draft, type: e.target.value })
              }
              className="flex-1 bg-background border border-input rounded-lg px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring text-foreground"
            >
              {ALERT_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="数值"
              value={draft.threshold}
              onChange={(e) =>
                onDraftChange({ ...draft, threshold: e.target.value })
              }
              className="w-24 bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring text-foreground"
            />
          </div>
          <button
            onClick={onAddAlert}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" /> 添加规则
          </button>

          <div className="mt-4">
            <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
              已有规则
            </h4>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
              {alerts
                .filter((a: AlertRule) => a.secid === quote.secid)
                .map((rule: AlertRule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between bg-secondary/50 px-3 py-2 rounded-lg border border-border"
                  >
                    <span className="text-xs font-medium text-secondary-foreground">
                      {ALERT_LABELS[rule.type]} {rule.threshold}
                      {rule.type.includes("CHANGE") ? "%" : ""}
                    </span>
                    <button
                      onClick={() => onRemoveAlert(rule.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              {alerts.filter((a: AlertRule) => a.secid === quote.secid)
                .length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4 bg-secondary/50 rounded-lg border border-border border-dashed">
                  暂无提醒规则
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Main Page Component
// ==========================================
export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [watchlistFilterTerm, setWatchlistFilterTerm] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [alertModalQuote, setAlertModalQuote] = useState<StockQuote | null>(
    null
  );
  const [alertDraft, setAlertDraft] = useState<AlertDraft>({
    type: "PRICE_ABOVE",
    threshold: "",
  });
  const [notifications, setNotifications] = useState<
    { id: number; message: string }[]
  >([]);
  const [runtimeLabel, setRuntimeLabel] = useState<string>("运行中");

  const {
    watchlist,
    quotesBySecid,
    alerts,
    loading,
    lastRefreshAt,
    colorMode,
    setColorMode,
    addToWatchlist: addStockToWatchlist,
    removeFromWatchlist: removeStockFromWatchlist,
    addAlert: addAlertRule,
    removeAlert: removeAlertRule,
    refreshQuotes,
    refreshSnapshots,
  } = useStockStore();

  function pushNotification(message: string): void {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setNotifications((current) => [...current, { id, message }]);
    window.setTimeout(
      () =>
        setNotifications((current) => current.filter((item) => item.id !== id)),
      5000
    );
  }

  useEffect(() => {
    setRuntimeLabel(getRuntimePlatform() === "web" ? "网页代理" : "运行时直连");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initialLoad() {
      try {
        await refreshQuotes();
      } catch (error) {
        if (!cancelled)
          toast.error(error instanceof Error ? error.message : "行情加载失败");
      }
    }
    async function periodicRefresh() {
      await refreshSnapshots();
    }
    initialLoad();
    const timer = window.setInterval(periodicRefresh, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshQuotes, refreshSnapshots]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchResults(await searchStocks(searchTerm));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "搜索失败");
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const quotes = watchlist
      .map((secid) => quotesBySecid[secid])
      .filter((q): q is StockQuote => Boolean(q));
    if (!quotes.length || !alerts.length) return;
    for (const quote of quotes) {
      for (const rule of alerts.filter((item) => item.secid === quote.secid)) {
        if (isAlertTriggered(rule, quote))
          pushNotification(
            `${getDisplayName(quote)} ${ALERT_LABELS[rule.type]} ${rule.threshold}`
          );
      }
    }
  }, [watchlist, quotesBySecid, alerts]);

  function addToWatchlist(item: StockSearchItem): void {
    const secid = toSecid(item);
    if (watchlist.includes(secid)) return;
    addStockToWatchlist(item);
    setIsAddModalOpen(false);
    setSearchTerm("");
    setSearchResults([]);
  }

  function handleAddAlert(): void {
    if (!alertModalQuote) return;
    const threshold = Number(alertDraft.threshold);
    if (!Number.isFinite(threshold)) {
      toast.error("请输入有效阈值");
      return;
    }
    addAlertRule({
      id: crypto.randomUUID(),
      secid: alertModalQuote.secid,
      type: alertDraft.type,
      threshold,
    });
    setAlertDraft((current) => ({ ...current, threshold: "" }));
  }

  const visibleStocks = useMemo(() => {
    const query = watchlistFilterTerm.toLowerCase();
    return watchlist
      .map((secid) => quotesBySecid[secid])
      .filter((q): q is StockQuote => Boolean(q))
      .filter(
        (q) =>
          q.name.toLowerCase().includes(query) ||
          q.code.toLowerCase().includes(query)
      );
  }, [watchlist, quotesBySecid, watchlistFilterTerm]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans selection:bg-accent overflow-hidden">
      <Header
        filterTerm={watchlistFilterTerm}
        onFilterChange={setWatchlistFilterTerm}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
      />

      <main className="flex-1 overflow-y-auto p-6 bg-muted/20 custom-scrollbar">
        {/* 全局最大宽度 5xl 对齐 (限制最多3列) */}
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
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 px-3 py-1.5 rounded-full transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> 添加自选
              </button>
            </div>
          </div>

          {loading && !visibleStocks.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin mb-3"></div>
              <p className="text-sm">加载行情中...</p>
            </div>
          ) : visibleStocks.length > 0 ? (
            // 此处修改为最多 3 列 lg:grid-cols-3
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleStocks.map((stock) => (
                <StockCard
                  key={stock.secid}
                  quote={stock}
                  colorMode={colorMode}
                  onAlert={() => setAlertModalQuote(stock)}
                  onRemove={() => {
                    removeStockFromWatchlist(stock.secid);
                    if (alertModalQuote?.secid === stock.secid)
                      setAlertModalQuote(null);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <GooseLogo className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">未找到相关自选股</p>
              {watchlistFilterTerm && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-4 text-xs font-medium bg-secondary text-secondary-foreground px-4 py-2 rounded-full hover:bg-secondary/80 transition-colors"
                >
                  去全局搜索添加
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 提醒 Toast */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="bg-foreground text-background px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-right-4 fade-in"
          >
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium">{n.message}</span>
          </div>
        ))}
      </div>

      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isSearching={isSearching}
        searchResults={searchResults}
        watchlist={watchlist}
        onAdd={addToWatchlist}
      />
      <AlertModal
        quote={alertModalQuote}
        onClose={() => setAlertModalQuote(null)}
        draft={alertDraft}
        onDraftChange={setAlertDraft}
        onAddAlert={handleAddAlert}
        alerts={alerts}
        onRemoveAlert={removeAlertRule}
      />
    </div>
  );
}
