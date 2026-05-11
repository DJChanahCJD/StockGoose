import type { AlertRule, StockQuote } from "@shared/types";

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
