import type {
  AlertRule,
  RealtimeSnapshot,
  StockQuote,
  StockSearchItem,
} from "@shared/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { fetchRealtimeSnapshots, fetchStockQuotes } from "@/lib/stocks/api";

export const STOCK_STORE_KEY = "stockgoose_data";
export const DEFAULT_WATCHLIST = ["105.AAPL", "116.01810", "1.000300"];

type ColorMode = "us" | "cn";

type StockStoreState = {
  watchlist: string[];
  quotesBySecid: Record<string, StockQuote>;
  alerts: AlertRule[];
  loading: boolean;
  refreshing: boolean;
  lastRefreshAt: string | null;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  addToWatchlist: (item: StockSearchItem) => void;
  removeFromWatchlist: (secid: string) => void;
  addAlert: (rule: AlertRule) => void;
  removeAlert: (id: string) => void;
  refreshQuotes: () => Promise<void>;
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

      setColorMode: (mode) => set({ colorMode: mode }),

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
       * 刷新自选行情，接口缺失项保留最新已知数据。
       */
      refreshQuotes: async () => {
        const { watchlist, refreshing } = get();
        if (!watchlist.length) {
          set({ quotesBySecid: {}, loading: false, refreshing: false });
          return;
        }
        if (refreshing) return;

        set((state) => ({
          loading: Object.keys(state.quotesBySecid).length === 0,
          refreshing: true,
          quotesBySecid: ensureWatchlistQuotes(
            state.watchlist,
            state.quotesBySecid
          ),
        }));

        try {
          const data = await fetchStockQuotes(watchlist);
          set((state) => ({
            quotesBySecid: mergeQuotes(
              state.watchlist,
              state.quotesBySecid,
              data
            ),
            lastRefreshAt: new Date().toISOString(),
          }));
        } finally {
          set({ loading: false, refreshing: false });
        }
      },

      /**
       * 用 qt.gtimg.cn 实时快照更新价格字段，保留已有趋势线。
       * 轻量、快速，适合高频轮询。
       */
      refreshSnapshots: async () => {
        const { watchlist } = get();
        if (!watchlist.length) return;

        try {
          const snapshots = await fetchRealtimeSnapshots(watchlist);
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
