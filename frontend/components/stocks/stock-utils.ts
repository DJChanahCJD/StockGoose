import type { AlertRule, StockQuote } from "@shared/types";

export type AlertDraft = { type: AlertRule["type"]; threshold: string };
export type ColorMode = "us" | "cn";
export type MarketFilter = "all" | "cn" | "hk" | "us" | "other";
export type StockViewMode = "card" | "list";

/** EastMoney 市场码常量，与 api.ts QT_MARKET_MAP 保持一致 */
const MARKET_CN = ["0", "1"] as const;
const MARKET_HK = "116";
const MARKET_US = "105";

/**
 * 从稳定输入生成 32 位种子。
 */
function createStableSeed(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/**
 * 基于线性同余算法生成确定性 0..1 浮点数。
 */
function nextStableRandom(seed: number): { seed: number; value: number } {
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;

  return {
    seed: nextSeed,
    value: nextSeed / 4294967296,
  };
}

/**
 * 为没有趋势数据的标的生成稳定占位走势，避免服务端和客户端首屏不一致。
 */
export function buildFallbackTrend(price: number, seedKey: string): number[] {
  let c = price;
  let seed = createStableSeed(seedKey);

  return Array.from({ length: 20 }, () => {
    const random = nextStableRandom(seed);
    seed = random.seed;
    c = Math.max(0.01, c + c * 0.01 * (random.value - 0.5));
    return Number(c.toFixed(2));
  });
}

/**
 * 将数字格式化为固定小数位展示。
 */
export function formatNumber(value: number | null, digits = 2): string {
  return value === null || Number.isNaN(value) ? "--" : value.toFixed(digits);
}

/**
 * 将趋势价格序列转换成 SVG polyline points。
 */
export function buildPolylinePoints(data: number[]): string {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data
    .map(
      (value, index) =>
        `${(index / (data.length - 1)) * 100},${
          100 - ((value - min) / range) * 100
        }`
    )
    .join(" ");
}

/**
 * 判断标的是否命中市场筛选。
 */
export function matchesMarketFilter(
  quote: StockQuote,
  filter: MarketFilter
): boolean {
  const isCnMarket = MARKET_CN.includes(
    quote.market as (typeof MARKET_CN)[number]
  );
  const isKnownMarket =
    isCnMarket || quote.market === MARKET_HK || quote.market === MARKET_US;

  if (filter === "all") return true;
  if (filter === "cn") return isCnMarket;
  if (filter === "hk") return quote.market === MARKET_HK;
  if (filter === "us") return quote.market === MARKET_US;
  return !isKnownMarket;
}

/**
 * 将行情更新时间格式化为本地时间。
 */
export function formatUpdateTime(value: string | null): string {
  if (!value) return "等待数据";
  const compactMatch = value.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/
  );
  const normalized =
    value.includes(" ") && !value.includes("T")
      ? value.replace(" ", "T")
      : value;
  const parsed = compactMatch
    ? new Date(
        Number(compactMatch[1]),
        Number(compactMatch[2]) - 1,
        Number(compactMatch[3]),
        Number(compactMatch[4]),
        Number(compactMatch[5]),
        Number(compactMatch[6])
      )
    : new Date(normalized);

  return Number.isNaN(parsed.getTime())
    ? value
    : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(parsed.getDate()).padStart(2, "0")} ${String(
        parsed.getHours()
      ).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(
        2,
        "0"
      )}:${String(parsed.getSeconds()).padStart(2, "0")}`;
}

/**
 * 根据市场颜色模式计算涨跌展示样式。
 */
export function getQuoteTone(
  quote: StockQuote,
  colorMode: ColorMode
): { colorClass: string; bgLightClass: string; isUp: boolean } {
  const isUp = (quote.change ?? 0) >= 0;
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

  return { colorClass, bgLightClass, isUp };
}
