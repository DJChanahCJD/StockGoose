import type {
  AlertRule,
  RealtimeSnapshot,
  StockQuote,
  StockSearchItem,
} from "@/lib/stocks/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { fetchRealtimeSnapshots, fetchStockQuotes } from "@/lib/stocks/api";
import type { StockGooseBackupData } from "@/lib/stocks/backup";
import type {
  MarketFilter,
  StockViewMode,
} from "@/components/stocks/stock-utils";

export const STOCK_STORE_KEY = "stockgoose_data";
export const DEFAULT_WATCHLIST = ["105.AAPL", "116.01810", "1.000300"];
const QUOTE_BATCH_SIZE = 12;
const SNAPSHOT_BATCH_SIZE = 12;
const fullQuoteLoadingSecids = new Set<string>();
const snapshotLoadingSecids = new Set<string>();

type ColorMode = "us" | "cn";

type StockStoreState = {
  watchlist: string[];
  quotesBySecid: Record<string, StockQuote>;
  alerts: AlertRule[];
  loading: boolean;
  refreshing: boolean;
  lastRefreshAt: string | null;
  colorMode: ColorMode;
  marketFilter: MarketFilter;
  viewMode: StockViewMode;
  setColorMode: (mode: ColorMode) => void;
  setMarketFilter: (filter: MarketFilter) => void;
  setViewMode: (mode: StockViewMode) => void;
  addToWatchlist: (item: StockSearchItem) => void;
  removeFromWatchlist: (secid: string) => void;
  reorderWatchlist: (nextWatchlist: string[]) => void;
  addAlert: (rule: AlertRule) => void;
  removeAlert: (id: string) => void;
  exportUserData: () => StockGooseBackupData;
  importUserData: (data: StockGooseBackupData) => void;
  refreshQuotes: () => Promise<void>;
  refreshQuotesFor: (secids: string[]) => Promise<void>;
  refreshSnapshotFor: (secid: string) => Promise<void>;
  refreshSnapshots: () => Promise<void>;
};

/**
 * 将搜索结果转成内部 secid。
 */
export function toSecid(item: StockSearchItem): string {
  return `${item.market}.${item.code}`;
}

/**
 * 为没有任何行情的自选标的生成占位 quote。
 */
function createPlaceholderQuote(secid: string): StockQuote {
  const [market = "", code = secid] = secid.split(".");

  return {
    secid,
    code,
    name: code,
    market,
    marketName: market,
    price: null,
    previousClose: null,
    change: null,
    changePercent: null,
    volume: null,
    amount: null,
    updatedAt: null,
    trend: [],
  };
}

/**
 * 按自选列表补齐行情字典，保证每个自选标的都有可渲染数据。
 */
function ensureWatchlistQuotes(
  watchlist: string[],
  quotesBySecid: Record<string, StockQuote>
): Record<string, StockQuote> {
  const next: Record<string, StockQuote> = {};

  for (const secid of watchlist) {
    next[secid] = quotesBySecid[secid] ?? createPlaceholderQuote(secid);
  }

  return next;
}

/**
 * 合并接口返回行情，未返回的标的保留最新已知数据。
 */
function mergeQuotes(
  watchlist: string[],
  current: Record<string, StockQuote>,
  incoming: StockQuote[]
): Record<string, StockQuote> {
  const next = ensureWatchlistQuotes(watchlist, current);

  for (const quote of incoming) {
    if (watchlist.includes(quote.secid)) {
      next[quote.secid] = quote;
    }
  }

  return next;
}

/**
 * 将 RealtimeSnapshot 的实时字段合并到已有 StockQuote，保留趋势线不变。
 */
function mergeSnapshotIntoQuote(
  quote: StockQuote,
  snapshot: RealtimeSnapshot
): StockQuote {
  return {
    ...quote,
    price: snapshot.price ?? quote.price,
    previousClose: snapshot.previousClose ?? quote.previousClose,
    change: snapshot.change ?? quote.change,
    changePercent: snapshot.changePercent ?? quote.changePercent,
    volume: snapshot.volume ?? quote.volume,
    amount: snapshot.amount ?? quote.amount,
    updatedAt: snapshot.updatedAt ?? quote.updatedAt,
  };
}

/**
 * 用实时快照批量更新行情字典。
 */
function mergeSnapshotsIntoQuotes(
  watchlist: string[],
  current: Record<string, StockQuote>,
  snapshots: RealtimeSnapshot[]
): Record<string, StockQuote> {
  const next = { ...ensureWatchlistQuotes(watchlist, current) };

  for (const snapshot of snapshots) {
    if (watchlist.includes(snapshot.secid)) {
      next[snapshot.secid] = mergeSnapshotIntoQuote(
        next[snapshot.secid],
        snapshot
      );
    }
  }

  return next;
}

/**
 * 将数组按固定大小切成多个批次。
 */
function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export const useStockStore = create<StockStoreState>()(
  persist(
    (set, get) => ({
      watchlist: DEFAULT_WATCHLIST,
      quotesBySecid: ensureWatchlistQuotes(DEFAULT_WATCHLIST, {}),
      alerts: [],
      loading: false,
      refreshing: false,
      lastRefreshAt: null,
      colorMode: "us" as ColorMode,
      marketFilter: "all",
      viewMode: "card",

      setColorMode: (mode) => set({ colorMode: mode }),
      setMarketFilter: (filter) => set({ marketFilter: filter }),
      setViewMode: (mode) => set({ viewMode: mode }),

      /**
       * 添加标的到自选，并立即生成可展示的占位卡片。
       */
      addToWatchlist: (item) => {
        const secid = toSecid(item);
        const { watchlist, quotesBySecid } = get();
        if (watchlist.includes(secid)) return;

        const quote: StockQuote = {
          ...createPlaceholderQuote(secid),
          code: item.code,
          name: item.name,
          market: item.market,
          marketName: item.marketName,
          securityType: item.securityType,
          securityTypeName: item.securityTypeName,
        };

        set({
          watchlist: [...watchlist, secid],
          quotesBySecid: {
            ...quotesBySecid,
            [secid]: quote,
          },
        });
      },

      /**
       * 从自选中移除标的，并清理对应行情和提醒。
       */
      removeFromWatchlist: (secid) => {
        const nextQuotes = { ...get().quotesBySecid };
        delete nextQuotes[secid];

        set((state) => ({
          watchlist: state.watchlist.filter((item) => item !== secid),
          quotesBySecid: nextQuotes,
          alerts: state.alerts.filter((item) => item.secid !== secid),
        }));
      },

      /**
       * 按拖拽结果重排自选列表，仅接受成员完全一致的新顺序。
       */
      reorderWatchlist: (nextWatchlist) => {
        const { watchlist } = get();
        const sameLength = nextWatchlist.length === watchlist.length;
        const sameMembers = watchlist.every((secid) =>
          nextWatchlist.includes(secid)
        );
        if (!sameLength || !sameMembers) return;

        set({ watchlist: nextWatchlist });
      },

      /**
       * 添加价格提醒规则。
       */
      addAlert: (rule) => {
        set((state) => ({
          alerts: [...state.alerts, rule],
        }));
      },

      /**
       * 删除价格提醒规则。
       */
      removeAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.filter((item) => item.id !== id),
        }));
      },

      /**
       * 导出用户可迁移数据，不包含行情缓存。
       */
      exportUserData: () => {
        const { watchlist, alerts, colorMode } = get();
        return {
          watchlist,
          alerts,
          colorMode,
        };
      },

      /**
       * 覆盖导入用户可迁移数据，并重建自选占位行情。
       */
      importUserData: (data) => {
        set({
          watchlist: data.watchlist,
          quotesBySecid: ensureWatchlistQuotes(data.watchlist, {}),
          alerts: data.alerts,
          colorMode: data.colorMode,
          lastRefreshAt: null,
        });
      },

      /**
       * 刷新自选行情，接口缺失项保留最新已知数据。
       */
      refreshQuotes: async () => {
        const { watchlist } = get();
        await get().refreshQuotesFor(watchlist.slice(0, QUOTE_BATCH_SIZE));
      },

      /**
       * 按指定标的批量刷新完整行情，适配首屏和滚动可见范围加载。
       */
      refreshQuotesFor: async (secids) => {
        const { watchlist } = get();
        if (!watchlist.length) {
          set({
            quotesBySecid: {},
            loading: false,
            refreshing: false,
          });
          return;
        }

        const requested = Array.from(new Set(secids)).filter(
          (secid) =>
            watchlist.includes(secid) && !fullQuoteLoadingSecids.has(secid)
        );
        if (!requested.length) return;
        requested.forEach((secid) => fullQuoteLoadingSecids.add(secid));

        set((state) => ({
          loading: Object.keys(state.quotesBySecid).length === 0,
          quotesBySecid: ensureWatchlistQuotes(
            state.watchlist,
            state.quotesBySecid
          ),
        }));

        try {
          const batches = chunkItems(requested, QUOTE_BATCH_SIZE);
          const data: StockQuote[] = [];
          for (const batch of batches) {
            data.push(...(await fetchStockQuotes(batch)));
          }

          set((state) => ({
            quotesBySecid: mergeQuotes(
              state.watchlist,
              state.quotesBySecid,
              data
            ),
            lastRefreshAt: new Date().toISOString(),
          }));
        } catch (error) {
          console.error("[store] refreshQuotes failed:", error);
        } finally {
          requested.forEach((secid) => fullQuoteLoadingSecids.delete(secid));
          set({ loading: false });
        }
      },

      /**
       * 刷新单个标的的实时快照，供详情弹窗低成本实时更新。
       */
      refreshSnapshotFor: async (secid) => {
        const { watchlist } = get();
        if (!watchlist.includes(secid)) return;
        if (snapshotLoadingSecids.has(secid)) return;

        snapshotLoadingSecids.add(secid);

        try {
          const snapshots = await fetchRealtimeSnapshots([secid]);
          set((state) => ({
            quotesBySecid: mergeSnapshotsIntoQuotes(
              state.watchlist,
              state.quotesBySecid,
              snapshots
            ),
            lastRefreshAt: snapshots.length
              ? new Date().toISOString()
              : state.lastRefreshAt,
          }));
        } catch (error) {
          console.error("[store] refreshSnapshotFor failed:", error);
        } finally {
          snapshotLoadingSecids.delete(secid);
        }
      },

      /**
       * 用 qt.gtimg.cn 实时快照更新价格字段，保留已有趋势线。
       * 轻量、快速，适合高频轮询。
       */
      refreshSnapshots: async () => {
        const { watchlist, refreshing } = get();
        if (!watchlist.length) return;
        if (refreshing) return;

        set({ refreshing: true });

        try {
          const snapshots: RealtimeSnapshot[] = [];
          for (const batch of chunkItems(watchlist, SNAPSHOT_BATCH_SIZE)) {
            snapshots.push(...(await fetchRealtimeSnapshots(batch)));
          }

          set((state) => ({
            quotesBySecid: mergeSnapshotsIntoQuotes(
              state.watchlist,
              state.quotesBySecid,
              snapshots
            ),
            lastRefreshAt: new Date().toISOString(),
          }));
        } catch (error) {
          console.error("[store] refreshSnapshots failed:", error);
        } finally {
          set({ refreshing: false });
        }
      },
    }),
    {
      name: STOCK_STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        watchlist: state.watchlist,
        quotesBySecid: ensureWatchlistQuotes(
          state.watchlist,
          state.quotesBySecid
        ),
        alerts: state.alerts,
        lastRefreshAt: state.lastRefreshAt,
        colorMode: state.colorMode,
      }),
    }
  )
);
