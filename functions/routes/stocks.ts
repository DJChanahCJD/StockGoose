import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type {
  StockQuote,
  StockSearchItem,
  StockTrendPoint,
} from "@shared/types";
import { ok, fail } from "@utils/response";
import { proxyGet } from "@utils/proxy";
import type { Env } from "../types/hono";

type SearchApiItem = {
  Code?: string;
  Name?: string;
  MktNum?: string;
  SecurityType?: string;
  SecurityTypeName?: string;
};

type TrendsApiData = {
  code?: string;
  market?: number;
  name?: string;
  preClose?: number;
  prePrice?: number;
  trends?: string[];
};

type TrendsApiResponse = {
  rc?: number;
  data?: TrendsApiData;
};

export const stockRoutes = new Hono<{ Bindings: Env }>();

const searchSchema = z.object({
  q: z.string().trim().min(1).max(40),
});

const trendsSchema = z.object({
  secid: z
    .string()
    .trim()
    .regex(/^\d+\.[A-Za-z0-9]+$/),
  days: z.coerce.number().int().min(1).max(5).default(1),
});

const quotesSchema = z.object({
  items: z.string().trim().min(1).max(500),
});

/**
 * 将搜索接口返回值归一化为前端共享类型。
 */
function normalizeSearchItem(item: SearchApiItem): StockSearchItem | null {
  if (!item.Code || !item.Name || !item.MktNum) return null;

  return {
    code: item.Code,
    name: item.Name,
    market: item.MktNum,
    marketName: item.MktNum,
    securityType: item.SecurityType,
    securityTypeName: item.SecurityTypeName,
  };
}

/**
 * 解析东方财富分时字符串。
 */
function parseTrend(line: string): StockTrendPoint | null {
  const [time, price, volume, average] = line.split(",");
  const parsedPrice = Number(price);
  if (!time || Number.isNaN(parsedPrice)) return null;

  return {
    time,
    price: parsedPrice,
    volume: Number(volume) || 0,
    average: Number(average) || parsedPrice,
  };
}

/**
 * 根据 secid 拉取东方财富分时数据。
 */
async function fetchTrendData(
  secid: string,
  days: number
): Promise<TrendsApiData> {
  const url = new URL("https://push2.eastmoney.com/api/qt/stock/trends2/get");
  url.searchParams.set("secid", secid);
  url.searchParams.set("fields1", "f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13");
  url.searchParams.set("fields2", "f51,f53,f56,f58");
  url.searchParams.set("iscr", "0");
  url.searchParams.set("iscca", "0");
  url.searchParams.set("ndays", String(days));

  const response = await proxyGet(url.toString());
  if (!response.ok) {
    throw new Error(`Eastmoney responded with ${response.status}`);
  }

  const body = (await response.json()) as TrendsApiResponse;
  if (body.rc !== 0 || !body.data) {
    throw new Error("Eastmoney returned an invalid trends payload");
  }

  return body.data;
}

/**
 * 根据分时数据生成行情快照。
 */
function buildQuote(secid: string, data: TrendsApiData): StockQuote {
  const [marketFromSecid, codeFromSecid] = secid.split(".");
  const trend = (data.trends ?? [])
    .map(parseTrend)
    .filter((point): point is StockTrendPoint => Boolean(point));
  const last = trend.at(-1) ?? null;
  const previousClose = data.preClose ?? data.prePrice ?? null;
  const price = last?.price ?? previousClose;
  const change =
    price !== null && previousClose !== null
      ? Number((price - previousClose).toFixed(3))
      : null;
  const changePercent =
    change !== null && previousClose
      ? Number(((change / previousClose) * 100).toFixed(2))
      : null;

  return {
    secid,
    code: data.code ?? codeFromSecid,
    name: data.name ?? codeFromSecid,
    market: String(data.market ?? marketFromSecid),
    marketName: String(data.market ?? marketFromSecid),
    price: price !== null ? Number(price.toFixed(3)) : null,
    previousClose:
      previousClose !== null ? Number(previousClose.toFixed(3)) : null,
    change,
    changePercent,
    volume: last?.volume ?? null,
    amount: null,
    updatedAt: last?.time ?? null,
    trend,
  };
}

stockRoutes.get("/search", zValidator("query", searchSchema), async (c) => {
  const { q } = c.req.valid("query");
  const url = new URL("https://base.itab.link/stock/search");
  url.searchParams.set("lang", "cn");
  url.searchParams.set("name", q);

  try {
    const response = await proxyGet(url.toString());
    if (!response.ok)
      return fail(c, `Stock search responded with ${response.status}`, 502);

    const body = (await response.json()) as {
      code?: number;
      data?: SearchApiItem[];
    };
    const data = (body.data ?? [])
      .map(normalizeSearchItem)
      .filter((item): item is StockSearchItem => Boolean(item));

    return ok(c, data);
  } catch (error) {
    console.error("Stock search error:", error);
    return fail(c, "股票搜索失败", 502);
  }
});

stockRoutes.get("/trends", zValidator("query", trendsSchema), async (c) => {
  const { secid, days } = c.req.valid("query");

  try {
    const data = await fetchTrendData(secid, days);
    return ok(c, buildQuote(secid, data));
  } catch (error) {
    console.error("Stock trends error:", error);
    return fail(c, "分时行情获取失败", 502);
  }
});

stockRoutes.get("/quotes", zValidator("query", quotesSchema), async (c) => {
  const { items } = c.req.valid("query");
  const secids = Array.from(
    new Set(
      items
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 24);

  try {
    const quotes = await Promise.all(
      secids.map((secid) =>
        fetchTrendData(secid, 1).then((data) => buildQuote(secid, data))
      )
    );
    return ok(c, quotes);
  } catch (error) {
    console.error("Stock quotes error:", error);
    return fail(c, "自选行情获取失败", 502);
  }
});
