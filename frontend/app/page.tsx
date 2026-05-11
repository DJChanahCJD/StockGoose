"use client";

import { useEffect, useMemo, useState } from "react";
import type { StockQuote, StockSearchItem } from "@shared/types";
import { toast } from "sonner";
import {
  AddStockDialog,
  AlertRulesDialog,
  DeleteStockDialog,
  getDisplayName,
  isAlertTriggered,
  NotificationStack,
  StockDetailsDialog,
  StockHeader,
  WatchlistGrid,
  type AlertDraft,
  ALERT_LABELS,
} from "@/components/stocks";
import { searchStocks } from "@/lib/stocks/api";
import { getRuntimePlatform } from "@/lib/stocks/platform";
import { toSecid, useStockStore } from "@/stores";

/**
 * 渲染 StockGoose 自选监控主页面。
 */
export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [watchlistFilterTerm, setWatchlistFilterTerm] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [alertDialogQuote, setAlertDialogQuote] = useState<StockQuote | null>(
    null
  );
  const [detailsDialogQuote, setDetailsDialogQuote] =
    useState<StockQuote | null>(null);
  const [deleteDialogQuote, setDeleteDialogQuote] = useState<StockQuote | null>(
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
    reorderWatchlist,
    addAlert: addAlertRule,
    removeAlert: removeAlertRule,
    refreshQuotes,
    refreshSnapshots,
  } = useStockStore();

  /**
   * 添加一个自动消失的本地提醒通知。
   */
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

    /**
     * 首次进入页面时加载完整行情。
     */
    async function initialLoad(): Promise<void> {
      try {
        await refreshQuotes();
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "行情加载失败");
        }
      }
    }

    /**
     * 后续使用轻量实时快照刷新价格字段。
     */
    async function periodicRefresh(): Promise<void> {
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
      .filter((quote): quote is StockQuote => Boolean(quote));
    if (!quotes.length || !alerts.length) return;

    for (const quote of quotes) {
      for (const rule of alerts.filter((item) => item.secid === quote.secid)) {
        if (isAlertTriggered(rule, quote)) {
          pushNotification(
            `${getDisplayName(quote)} ${ALERT_LABELS[rule.type]} ${
              rule.threshold
            }`
          );
        }
      }
    }
  }, [watchlist, quotesBySecid, alerts]);

  /**
   * 将搜索结果加入自选列表。
   */
  function addToWatchlist(item: StockSearchItem): void {
    const secid = toSecid(item);
    if (watchlist.includes(secid)) return;
    addStockToWatchlist(item);
    setIsAddDialogOpen(false);
    setSearchTerm("");
    setSearchResults([]);
  }

  /**
   * 为当前提醒弹窗标的新增一条提醒规则。
   */
  function handleAddAlert(): void {
    if (!alertDialogQuote) return;
    const threshold = Number(alertDraft.threshold);
    if (!Number.isFinite(threshold)) {
      toast.error("请输入有效阈值");
      return;
    }

    addAlertRule({
      id: crypto.randomUUID(),
      secid: alertDialogQuote.secid,
      type: alertDraft.type,
      threshold,
    });
    setAlertDraft((current) => ({ ...current, threshold: "" }));
  }

  /**
   * 确认删除当前选中的自选标的。
   */
  function handleConfirmDelete(): void {
    if (!deleteDialogQuote) return;

    removeStockFromWatchlist(deleteDialogQuote.secid);
    if (alertDialogQuote?.secid === deleteDialogQuote.secid) {
      setAlertDialogQuote(null);
    }
    if (detailsDialogQuote?.secid === deleteDialogQuote.secid) {
      setDetailsDialogQuote(null);
    }
    setDeleteDialogQuote(null);
  }

  const visibleStocks = useMemo(() => {
    const query = watchlistFilterTerm.toLowerCase();
    return watchlist
      .map((secid) => quotesBySecid[secid])
      .filter((quote): quote is StockQuote => Boolean(quote))
      .filter(
        (quote) =>
          quote.name.toLowerCase().includes(query) ||
          quote.code.toLowerCase().includes(query)
      );
  }, [watchlist, quotesBySecid, watchlistFilterTerm]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans selection:bg-accent overflow-hidden">
      <StockHeader
        filterTerm={watchlistFilterTerm}
        onFilterChange={setWatchlistFilterTerm}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
      />

      <WatchlistGrid
        loading={loading}
        visibleStocks={visibleStocks}
        watchlist={watchlist}
        filterTerm={watchlistFilterTerm}
        runtimeLabel={runtimeLabel}
        lastRefreshAt={lastRefreshAt}
        colorMode={colorMode}
        onOpenAddDialog={() => setIsAddDialogOpen(true)}
        onOpenAlertDialog={setAlertDialogQuote}
        onOpenDetailsDialog={setDetailsDialogQuote}
        onOpenDeleteDialog={setDeleteDialogQuote}
        onReorderWatchlist={reorderWatchlist}
      />

      <NotificationStack notifications={notifications} />

      <AddStockDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isSearching={isSearching}
        searchResults={searchResults}
        watchlist={watchlist}
        onAdd={addToWatchlist}
      />
      <AlertRulesDialog
        quote={alertDialogQuote}
        onClose={() => setAlertDialogQuote(null)}
        draft={alertDraft}
        onDraftChange={setAlertDraft}
        onAddAlert={handleAddAlert}
        alerts={alerts}
        onRemoveAlert={removeAlertRule}
      />
      <StockDetailsDialog
        quote={detailsDialogQuote}
        colorMode={colorMode}
        onClose={() => setDetailsDialogQuote(null)}
      />
      <DeleteStockDialog
        quote={deleteDialogQuote}
        onClose={() => setDeleteDialogQuote(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
