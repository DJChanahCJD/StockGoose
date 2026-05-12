import type { AlertRule } from "@/lib/stocks/types";
import type { ColorMode } from "@/components/stocks/stock-utils";

const BACKUP_APP_NAME = "StockGoose";
const BACKUP_VERSION = 1;

export type StockGooseBackupData = {
  watchlist: string[];
  alerts: AlertRule[];
  colorMode: ColorMode;
};

export type StockGooseBackupV1 = {
  app: typeof BACKUP_APP_NAME;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: StockGooseBackupData;
};

/**
 * 创建 StockGoose v1 用户数据备份对象。
 */
export function createStockBackup(
  data: StockGooseBackupData
): StockGooseBackupV1 {
  return {
    app: BACKUP_APP_NAME,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/**
 * 将备份对象序列化为可读 JSON。
 */
export function serializeStockBackup(backup: StockGooseBackupV1): string {
  return JSON.stringify(backup, null, 2);
}

/**
 * 生成 StockGoose 备份文件名。
 */
export function getStockBackupFileName(date = new Date()): string {
  return `stockgoose-backup-${date.toISOString().slice(0, 10)}.json`;
}

/**
 * 校验并解析 StockGoose v1 备份文件。
 */
export function parseStockBackup(payload: unknown): StockGooseBackupData {
  if (!isRecord(payload)) {
    throw new Error("备份文件格式无效");
  }
  if (payload.app !== BACKUP_APP_NAME || payload.version !== BACKUP_VERSION) {
    throw new Error("不支持的备份文件");
  }
  if (!isRecord(payload.data)) {
    throw new Error("备份文件缺少数据");
  }

  const watchlist = parseWatchlist(payload.data.watchlist);
  return {
    watchlist,
    alerts: parseAlertRules(payload.data.alerts, watchlist),
    colorMode: parseColorMode(payload.data.colorMode),
  };
}

/**
 * 判断输入是否为普通对象，便于安全读取未知 JSON。
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 从未知输入中解析颜色模式。
 */
function parseColorMode(value: unknown): ColorMode {
  return value === "cn" || value === "us" ? value : "us";
}

/**
 * 从未知输入中解析并去重自选列表。
 */
function parseWatchlist(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("备份文件中的自选列表无效");
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

/**
 * 从未知输入中解析提醒规则，仅保留仍属于导入自选列表的规则。
 */
function parseAlertRules(value: unknown, watchlist: string[]): AlertRule[] {
  if (!Array.isArray(value)) {
    throw new Error("备份文件中的提醒规则无效");
  }

  const watchlistSet = new Set(watchlist);
  return value.filter((item): item is AlertRule =>
    isImportableAlertRule(item, watchlistSet)
  );
}

/**
 * 判断未知输入是否为可导入的提醒规则。
 */
function isImportableAlertRule(
  value: unknown,
  watchlistSet: Set<string>
): value is AlertRule {
  if (!isRecord(value)) return false;

  const validType =
    value.type === "PRICE_ABOVE" ||
    value.type === "PRICE_BELOW" ||
    value.type === "CHANGE_PERCENT_ABOVE" ||
    value.type === "CHANGE_PERCENT_BELOW";

  return (
    typeof value.id === "string" &&
    typeof value.secid === "string" &&
    validType &&
    typeof value.threshold === "number" &&
    Number.isFinite(value.threshold) &&
    watchlistSet.has(value.secid)
  );
}
