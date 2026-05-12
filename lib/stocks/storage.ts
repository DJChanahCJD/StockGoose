import type { AlertRule } from "@/lib/stocks/types";

export const DEFAULT_WATCHLIST = ["105.AAPL", "116.01810", "1.000300"];

const WATCHLIST_KEY = "stockgoose_watchlist";
const ALERTS_KEY = "stockgoose_alerts";

/**
 * 安全读取 JSON 本地存储。
 */
function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * 安全写入 JSON 本地存储。
 */
function writeStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/**
 * 读取自选列表。
 */
export function readWatchlist(): string[] {
  const stored = readStorage<string[]>(WATCHLIST_KEY, DEFAULT_WATCHLIST);
  return stored.length ? stored : DEFAULT_WATCHLIST;
}

/**
 * 保存自选列表。
 */
export function writeWatchlist(value: string[]): void {
  writeStorage(WATCHLIST_KEY, Array.from(new Set(value)));
}

/**
 * 读取提醒规则。
 */
export function readAlertRules(): AlertRule[] {
  return readStorage<AlertRule[]>(ALERTS_KEY, []);
}

/**
 * 保存提醒规则。
 */
export function writeAlertRules(value: AlertRule[]): void {
  writeStorage(ALERTS_KEY, value);
}
