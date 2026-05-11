"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { StockQuote } from "@shared/types";
import type { ColorMode } from "@/components/stocks/stock-utils";
import {
  buildFallbackTrend,
  buildPolylinePoints,
  getQuoteTone,
} from "@/components/stocks/stock-utils";

/**
 * 封装趋势线计算和涨跌配色逻辑，供卡片/列表模式共用。
 */
export function useStockQuoteTrend(quote: StockQuote, colorMode: ColorMode) {
  const trend = useMemo(
    () => (quote.trend.length ? quote.trend.map((item) => item.price) : null),
    [quote.trend]
  );
  const { colorClass, bgLightClass, isUp } = getQuoteTone(quote, colorMode);
  const Icon = isUp ? TrendingUp : TrendingDown;

  const fallbackPoints = useMemo(
    () =>
      buildPolylinePoints(
        buildFallbackTrend(quote.price ?? 1, `${quote.secid}:${quote.price}`)
      ),
    [quote.price, quote.secid]
  );
  const points = trend ? buildPolylinePoints(trend) : fallbackPoints;

  return { trend, points, colorClass, bgLightClass, isUp, Icon } as const;
}
