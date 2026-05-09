import type { ApiResponse, StockQuote, StockSearchItem } from "@shared/types";
import { shouldUseProxy } from "./platform";
import { API_URL } from "../api/config";

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

/**
 * 读取 JSON 并统一转换错误。
 */
async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }

  return (await response.json()) as T;
}

/**
 * 解包项目后端统一响应。
 */
async function readApiResponse<T>(response: Response): Promise<T> {
  const body = await readJson<ApiResponse<T>>(response);
  if (!body.success) {
    throw new Error(body.message || "请求失败");
  }

  return body.data as T;
}

/**
 * 归一化搜索结果。
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
 * 将东方财富分时数据转换为行情快照。
 */
function buildQuote(secid: string, data: TrendsApiData): StockQuote {
  const [marketFromSecid, codeFromSecid] = secid.split(".");
  const trend = (data.trends ?? [])
    .map((line) => {
      const [time, price, volume, average] = line.split(",");
      const parsedPrice = Number(price);
      if (!time || Number.isNaN(parsedPrice)) return null;

      return {
        time,
        price: parsedPrice,
        volume: Number(volume) || 0,
        average: Number(average) || parsedPrice,
      };
    })
    .filter((point): point is StockQuote["trend"][number] => Boolean(point));
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

/**
 * 直连股票搜索源站。
 */
async function searchDirect(query: string): Promise<StockSearchItem[]> {
  const url = new URL("https://base.itab.link/stock/search");
  url.searchParams.set("lang", "cn");
  url.searchParams.set("name", query);

  const body = await readJson<{ data?: SearchApiItem[] }>(await fetch(url));
  return (body.data ?? [])
    .map(normalizeSearchItem)
    .filter((item): item is StockSearchItem => Boolean(item));
}

/**
 * 直连东方财富分时数据。
 */
async function fetchQuoteDirect(secid: string, days = 1): Promise<StockQuote> {
  const url = new URL("https://push2.eastmoney.com/api/qt/stock/trends2/get");
  url.searchParams.set("secid", secid);
  url.searchParams.set("fields1", "f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13");
  url.searchParams.set("fields2", "f51,f53,f56,f58");
  url.searchParams.set("iscr", "0");
  url.searchParams.set("iscca", "0");
  url.searchParams.set("ndays", String(days));

  const body = await readJson<{ rc?: number; data?: TrendsApiData }>(
    await fetch(url)
  );
  if (body.rc !== 0 || !body.data) {
    throw new Error("行情数据格式异常");
  }

  return buildQuote(secid, body.data);
}

/**
 * 搜索股票，网页端走后端代理，其他运行时直连。
 */
export async function searchStocks(query: string): Promise<StockSearchItem[]> {
  if (!query.trim()) return [];

  if (!shouldUseProxy()) {
    return searchDirect(query.trim());
  }

  const url = new URL("/stocks/search", API_URL);
  url.searchParams.set("q", query.trim());
  return readApiResponse<StockSearchItem[]>(await fetch(url));
}

/**
 * 获取单个标的行情。
 */
export async function fetchStockQuote(
  secid: string,
  days = 1
): Promise<StockQuote> {
  if (!shouldUseProxy()) {
    return fetchQuoteDirect(secid, days);
  }

  const url = new URL("/stocks/trends", API_URL);
  url.searchParams.set("secid", secid);
  url.searchParams.set("days", String(days));
  return readApiResponse<StockQuote>(await fetch(url));
}

/**
 * 批量获取自选行情。
 */
export async function fetchStockQuotes(
  secids: string[]
): Promise<StockQuote[]> {
  console.log(API_URL);
  const uniqueSecids = Array.from(new Set(secids)).filter(Boolean);
  if (!uniqueSecids.length) return [];

  if (!shouldUseProxy()) {
    return Promise.all(uniqueSecids.map((secid) => fetchQuoteDirect(secid)));
  }

  const url = new URL("/stocks/quotes", API_URL);
  url.searchParams.set("items", uniqueSecids.join(","));
  return readApiResponse<StockQuote[]>(await fetch(url));
}
