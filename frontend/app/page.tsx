"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { StockQuote, StockSearchItem } from "@shared/types";
import { toast } from "sonner";
import {
  AddStockDialog,
  AlertRulesDialog,
  DeleteStockDialog,
  matchesMarketFilter,
  NotificationStack,
  StockDetailsDialog,
  StockHeader,
  WatchlistGrid,
  type AlertDraft,
} from "@/components/stocks";
import { Footer } from "@/components/footer";
import { AlertScheduler } from "@/lib/stocks/alert-scheduler";
import { searchStocks } from "@/lib/stocks/api";
import {
  createStockBackup,
  getStockBackupFileName,
  parseStockBackup,
  serializeStockBackup,
} from "@/lib/stocks/backup";
import { createNotifier } from "@/lib/stocks/notifier";
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

  const {
    watchlist,
    quotesBySecid,
    alerts,
    loading,
    colorMode,
    marketFilter,
    viewMode,
    setColorMode,
    setMarketFilter,
    setViewMode,
    addToWatchlist: addStockToWatchlist,
    removeFromWatchlist: removeStockFromWatchlist,
    reorderWatchlist,
    addAlert: addAlertRule,
    removeAlert: removeAlertRule,
    exportUserData,
    importUserData,
    refreshQuotes,
    refreshQuotesFor,
    refreshSnapshots,
  } = useStockStore();

  /**
   * 添加一个自动消失的本地提醒通知。
   */
  const pushNotification = useCallback((message: string): void => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setNotifications((current) => [...current, { id, message }]);
    window.setTimeout(
      () =>
        setNotifications((current) => current.filter((item) => item.id !== id)),
      5000
    );
  }, []);

  const notifier = useMemo(() => createNotifier("web"), []);

  useEffect(() => {
    let cancelled = false;
    let scheduler: AlertScheduler | null = null;

    /**
     * 首次进入页面时加载完整行情，完成后启动提醒调度器。
     * 合并为单个 effect 避免 mount 时 refreshQuotes + refreshSnapshots 双重加载。
     */
    async function initialLoad(): Promise<void> {
      try {
        await refreshQuotes();
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "行情加载失败");
        }
      }

      if (cancelled) return;

      scheduler = new AlertScheduler({
        getAlerts: () => useStockStore.getState().alerts,
        getQuotes: () => useStockStore.getState().quotesBySecid,
        refresh: refreshSnapshots,
        notifier,
        onLocalNotify: pushNotification,
      });
      scheduler.start();
    }

    initialLoad();
    return () => {
      cancelled = true;
      scheduler?.stop();
    };
  }, [notifier, pushNotification, refreshQuotes, refreshSnapshots]);

  /**
   * 为当前网格已展开的标的补齐完整分时行情。
   */
  const handleVisibleSecidsChange = useCallback(
    (secids: string[]): void => {
      void refreshQuotesFor(secids);
    },
    [refreshQuotesFor]
  );

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

    if (alerts.length === 0) {
      void notifier.requestPermission();
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

  /**
   * 将当前用户数据保存为本地 JSON 备份文件。
   */
  function handleExportData(): void {
    const content = serializeStockBackup(createStockBackup(exportUserData()));
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getStockBackupFileName();
    link.click();
    URL.revokeObjectURL(url);
    toast.success("备份已导出");
  }

  /**
   * 读取本地 JSON 备份并覆盖导入用户数据。
   */
  async function handleImportData(file: File): Promise<void> {
    try {
      const payload = JSON.parse(await file.text()) as unknown;
      importUserData(parseStockBackup(payload));
      await refreshQuotes();
      toast.success("备份已导入");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "备份导入失败");
    }
  }

  const visibleStocks = useMemo(() => {
    const query = watchlistFilterTerm.toLowerCase();
    return watchlist
      .map((secid) => quotesBySecid[secid])
      .filter((quote): quote is StockQuote => Boolean(quote))
      .filter(
        (quote) =>
          matchesMarketFilter(quote, marketFilter) &&
          (quote.name.toLowerCase().includes(query) ||
            quote.code.toLowerCase().includes(query))
      );
  }, [watchlist, quotesBySecid, watchlistFilterTerm, marketFilter]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans selection:bg-accent overflow-hidden">
      <StockHeader
        filterTerm={watchlistFilterTerm}
        onFilterChange={setWatchlistFilterTerm}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        onExportData={handleExportData}
        onImportData={(file) => void handleImportData(file)}
      />

      <div className="flex-1 overflow-auto">
        <WatchlistGrid
          loading={loading}
          visibleStocks={visibleStocks}
          watchlist={watchlist}
          filterTerm={watchlistFilterTerm}
          colorMode={colorMode}
          marketFilter={marketFilter}
          onMarketFilterChange={setMarketFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          alerts={alerts}
          onOpenAddDialog={() => {
            // 如果过滤框有内容，预填到全局搜索框
            if (watchlistFilterTerm.trim()) {
              setSearchTerm(watchlistFilterTerm.trim());
            }
            setIsAddDialogOpen(true);
          }}
          onOpenAlertDialog={setAlertDialogQuote}
          onOpenDetailsDialog={setDetailsDialogQuote}
          onOpenDeleteDialog={setDeleteDialogQuote}
          onVisibleSecidsChange={handleVisibleSecidsChange}
          onReorderWatchlist={reorderWatchlist}
        />
        <div className="px-4 py-2 text-center text-xs text-muted-foreground">
          共 {visibleStocks.length} 个标的
        </div>
        <Footer />
      </div>

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
