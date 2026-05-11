import type { AlertRule, StockQuote } from "@shared/types";

export type AlertDraft = { type: AlertRule["type"]; threshold: string };
export type ColorMode = "us" | "cn";

export const ALERT_LABELS: Record<AlertRule["type"], string> = {
  PRICE_ABOVE: "价格高于",
  PRICE_BELOW: "价格低于",
  CHANGE_PERCENT_ABOVE: "涨幅高于",
  CHANGE_PERCENT_BELOW: "跌幅低于",
};

export const ALERT_OPTIONS: Array<{ value: AlertRule["type"]; label: string }> =
  [
    { value: "PRICE_ABOVE", label: "价格高于" },
    { value: "PRICE_BELOW", label: "价格低于" },
    { value: "CHANGE_PERCENT_ABOVE", label: "日涨幅大于(%)" },
    { value: "CHANGE_PERCENT_BELOW", label: "日跌幅大于(%)" },
  ];

/**
 * 为没有趋势数据的标的生成轻量占位走势。
 */
export function buildFallbackTrend(price: number): number[] {
  let c = price;
  return Array.from({ length: 20 }, () => {
    c = Math.max(0.01, c + c * 0.01 * (Math.random() - 0.5));
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
 * 判断一条提醒规则是否被当前行情触发。
 */
export function isAlertTriggered(rule: AlertRule, quote: StockQuote): boolean {
  if (rule.type === "PRICE_ABOVE") {
    return quote.price !== null && quote.price >= rule.threshold;
  }
  if (rule.type === "PRICE_BELOW") {
    return quote.price !== null && quote.price <= rule.threshold;
  }
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
 * 获取标的展示名称。
 */
export function getDisplayName(quote: StockQuote): string {
  return quote.name || quote.code;
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
