import type {
  ApiResponse,
  RealtimeSnapshot,
  StockHistoryPoint,
  StockHistoryRange,
  StockQuote,
  StockSearchItem,
} from "@shared/types";
import { mutate } from "@/lib/utils/cache";
import { retry } from "@/lib/utils";
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

type RawHistoryPoint = {
  date: string;
  close: number;
};

type KlineApiResponse = {
  rc?: number;
  data?: {
    klines?: string[];
  };
};

type TencentKlinePoint = [string, string, string, string, string, string];

type TencentKlineResponse = {
  code?: number;
  data?: Record<
    string,
    { qfqday?: TencentKlinePoint[]; day?: TencentKlinePoint[] }
  >;
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
 * 根据区间筛选历史日 K 数据。
 */
function filterHistoryByRange(
  points: RawHistoryPoint[],
  range: StockHistoryRange
): RawHistoryPoint[] {
  if (range === "all" || points.length === 0) return points;

  const last = points.at(-1);
  if (!last) return points;

  const cutoff = new Date(`${last.date}T00:00:00`);
  if (Number.isNaN(cutoff.getTime())) return points;

  if (range === "1m") cutoff.setMonth(cutoff.getMonth() - 1);
  if (range === "3m") cutoff.setMonth(cutoff.getMonth() - 3);
  if (range === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
  if (range === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);
  if (range === "3y") cutoff.setFullYear(cutoff.getFullYear() - 3);
  if (range === "5y") cutoff.setFullYear(cutoff.getFullYear() - 5);
  if (range === "10y") cutoff.setFullYear(cutoff.getFullYear() - 10);

  return points.filter((point) => new Date(`${point.date}T00:00:00`) >= cutoff);
}

/**
 * 将历史范围转换成 K 线请求条数。
 */
function getHistoryLimit(range: StockHistoryRange): number {
  if (range === "1m") return 31;
  if (range === "3m") return 93;
  if (range === "6m") return 186;
  if (range === "1y") return 366;
  if (range === "3y") return 1095;
  if (range === "5y") return 1825;
  if (range === "10y") return 3650;
  return 5000;
}

/**
 * 解析 EastMoney 日 K 字符串中的日期和收盘价。
 */
function parseKline(line: string): RawHistoryPoint | null {
  const [date, , close] = line.split(",");
  const parsedClose = Number(close);
  if (!date || !Number.isFinite(parsedClose)) return null;

  return { date, close: parsedClose };
}

/**
 * 将历史收盘价转换为区间累计涨跌幅。
 */
function buildHistoryPoints(points: RawHistoryPoint[]): StockHistoryPoint[] {
  const base = points.find((point) => point.close > 0)?.close;
  if (!base) return [];

  return points.map((point) => ({
    date: point.date,
    close: Number(point.close.toFixed(3)),
    changePercent: Number(((point.close / base - 1) * 100).toFixed(2)),
  }));
}

/**
 * 直连东方财富历史 K 线。
 */
async function fetchHistoryFromEastmoney(
  secid: string,
  range: StockHistoryRange
): Promise<StockHistoryPoint[]> {
  const url = new URL("https://push2his.eastmoney.com/api/qt/stock/kline/get");
  url.searchParams.set("secid", secid);
  url.searchParams.set("fields1", "f1,f2,f3,f4,f5,f6");
  url.searchParams.set(
    "fields2",
    "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61"
  );
  url.searchParams.set("klt", "101");
  url.searchParams.set("fqt", "1");
  url.searchParams.set("end", "20500101");
  url.searchParams.set("lmt", String(getHistoryLimit(range)));

  const body = await readJson<KlineApiResponse>(await fetch(url));
  if (body.rc !== 0 || !body.data?.klines) {
    throw new Error("东方财富历史走势格式异常");
  }

  const rawPoints = body.data.klines
    .map(parseKline)
    .filter((point): point is RawHistoryPoint => Boolean(point));
  const points = buildHistoryPoints(filterHistoryByRange(rawPoints, range));
  if (!points.length) throw new Error("东方财富历史走势为空");

  return points;
}

/**
 * 直连腾讯财经历史 K 线。
 */
async function fetchHistoryFromTencentDirect(
  secid: string,
  range: StockHistoryRange
): Promise<StockHistoryPoint[]> {
  const qtCode = toQtCode(secid);
  if (!qtCode) throw new Error(`无法转换股票代码: ${secid}`);

  const url = new URL("https://web.ifzq.gtimg.cn/appstock/app/fqkline/get");
  url.searchParams.set(
    "param",
    `${qtCode},day,,,${getHistoryLimit(range)},qfq`
  );

  const body = await readJson<TencentKlineResponse>(await fetch(url));
  const qtData = body.data?.[qtCode];
  const dayData = qtData?.qfqday ?? qtData?.day;
  if (!dayData?.length) throw new Error("腾讯历史走势为空");

  const rawPoints = dayData.flatMap((entry) => {
    const date = entry[0];
    const close = Number(entry[2]);
    if (!date || !Number.isFinite(close)) return [];
    return [{ date, close }];
  });
  const points = buildHistoryPoints(filterHistoryByRange(rawPoints, range));
  if (!points.length) throw new Error("腾讯历史走势处理后为空");

  return points;
}

/**
 * 直连历史 K 线数据源，优先东方财富，失败时回退腾讯财经。
 */
async function fetchHistoryDirect(
  secid: string,
  range: StockHistoryRange
): Promise<StockHistoryPoint[]> {
  try {
    return await fetchHistoryFromEastmoney(secid, range);
  } catch {
    return fetchHistoryFromTencentDirect(secid, range);
  }
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
 * 获取单个标的的历史累计涨跌幅。
 * 浏览器直连历史数据源，不经过后端代理。
 */
export async function fetchStockHistory(
  secid: string,
  range: StockHistoryRange
): Promise<StockHistoryPoint[]> {
  const cacheKey = `stocks:history:${secid}:${range}`;

  return mutate(
    cacheKey,
    () => retry(() => fetchHistoryDirect(secid, range), 2),
    { revalidate: false }
  ).then((result) => result ?? []);
}

/**
 * 批量获取自选行情。
 */
export async function fetchStockQuotes(
  secids: string[]
): Promise<StockQuote[]> {
  const uniqueSecids = Array.from(new Set(secids)).filter(Boolean);
  if (!uniqueSecids.length) return [];

  if (!shouldUseProxy()) {
    return mutate(
      `stocks:direct:${uniqueSecids.join(",")}`,
      () => Promise.all(uniqueSecids.map((secid) => fetchQuoteDirect(secid))),
      { revalidate: false }
    ).then((result) => result ?? []);
  }

  const url = new URL("/stocks/quotes", API_URL);
  url.searchParams.set("items", uniqueSecids.join(","));
  return mutate(
    `stocks:proxy:${uniqueSecids.join(",")}`,
    async () => readApiResponse<StockQuote[]>(await fetch(url)),
    { revalidate: false }
  ).then((result) => result ?? []);
}

/** EastMoney 市场码 → qt.gtimg.cn 前缀 */
const QT_MARKET_MAP: Record<string, string> = {
  "0": "sz",
  "1": "sh",
  "105": "us",
  "106": "us",
  "116": "hk",
};

/** EastMoney 市场码 → 美股交易所后缀 */
const US_MARKET_SUFFIX: Record<string, string> = {
  "105": ".N", // NYSE
  "106": ".OQ", // NASDAQ
  "107": ".A", // AMEX
};

/** qt.gtimg.cn 前缀 → EastMoney 市场码 */
const QT_PREFIX_REVERSE: Record<string, string> = {
  sz: "0",
  sh: "1",
  hk: "116",
  us: "105",
};

/**
 * 根据美股代码和 EastMoney 市场码判断交易所后缀。
 * 优先使用市场码映射，回退到代码位数启发式规则。
 */
function getUSSuffix(code: string, market: string): string {
  const mapped = US_MARKET_SUFFIX[market];
  if (mapped) return mapped;

  // 回退：基于代码位数的启发式规则
  // NASDAQ 股票通常 4-5 个字母，NYSE 通常 1-3 个字母
  const baseCode = code.includes(".") ? code.split(".")[0] : code;
  if (baseCode.length >= 4) return ".OQ";
  return ".N";
}

/** EastMoney secid → qt.gtimg.cn 股票代码 (如 0.000858 → sz000858, 106.AAPL → usAAPL.OQ) */
function toQtCode(secid: string): string | null {
  const [market, code] = secid.split(".");
  const prefix = QT_MARKET_MAP[market];
  if (!prefix || !code) return null;

  if (prefix === "us") {
    const suffix = getUSSuffix(code, market);
    return `${prefix}${code}${suffix}`;
  }
  return `${prefix}${code}`;
}

/** null 安全的数字解析 */
function parseNum(val: string | undefined): number | null {
  if (!val || val === "") return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

/**
 * 解析 qt.gtimg.cn 返回的单行 GBK 数据。
 * 响应格式: v_sz000858="51~五粮液~000858~27.78~..."
 */
function parseRealtimeLine(line: string): RealtimeSnapshot | null {
  const match = line.match(/^v_([\w.]+)="(.+)"\s*;?\s*$/);
  if (!match) return null;

  const qtCode = match[1];
  const fields = match[2].split("~");
  const qtPrefix = qtCode.match(/^[a-z]+/)?.[0] ?? "";
  const rawCode = fields[2];
  const code =
    qtPrefix === "us"
      ? rawCode.replace(/\.[A-Z]+$/, "") // 去除美股交易所后缀（如 AAPL.OQ → AAPL）
      : rawCode;
  const name = fields[1];
  const market = QT_PREFIX_REVERSE[qtPrefix] ?? "";
  const price = parseNum(fields[3]);
  const previousClose = parseNum(fields[4]);

  return {
    secid: `${market}.${code}`,
    code,
    name,
    price,
    previousClose,
    open: parseNum(fields[5]),
    high: parseNum(fields[33]),
    low: parseNum(fields[34]),
    change:
      price !== null && previousClose !== null
        ? Number((price - previousClose).toFixed(3))
        : parseNum(fields[31]),
    changePercent: parseNum(fields[32]),
    volume: parseNum(fields[6]),
    amount: parseNum(fields[37]),
    turnoverRate: parseNum(fields[38]),
    pe: parseNum(fields[39]),
    amplitude: parseNum(fields[43]),
    totalMarketCap: parseNum(fields[45]),
    highLimit: parseNum(fields[47]),
    lowLimit: parseNum(fields[48]),
    bidPrice: parseNum(fields[9]),
    bidVolume: parseNum(fields[10]),
    askPrice: parseNum(fields[19]),
    askVolume: parseNum(fields[20]),
    updatedAt: fields[30] || null,
  };
}

/** Tauri 直连 qt.gtimg.cn 获取实时行情快照 */
async function fetchRealtimeDirect(
  secids: string[]
): Promise<RealtimeSnapshot[]> {
  const qtCodes = secids.map(toQtCode).filter((c): c is string => c !== null);
  if (!qtCodes.length) return [];

  const url = `http://qt.gtimg.cn/q=${qtCodes.join(",")}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`腾讯行情响应异常: ${response.status}`);

  const buffer = await response.arrayBuffer();
  const text = new TextDecoder("gbk").decode(buffer);

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseRealtimeLine)
    .filter((s): s is RealtimeSnapshot => s !== null);
}

/**
 * 获取单个标的实时快照。
 */
export async function fetchRealtimeSnapshot(
  secid: string
): Promise<RealtimeSnapshot | null> {
  const results = await fetchRealtimeSnapshots([secid]);
  return results[0] ?? null;
}

/**
 * 批量获取实时行情快照。
 * 网页端走后端代理（自动处理 GBK），Tauri 直连 qt.gtimg.cn。
 */
export async function fetchRealtimeSnapshots(
  secids: string[]
): Promise<RealtimeSnapshot[]> {
  const unique = Array.from(new Set(secids)).filter(Boolean);
  if (!unique.length) return [];

  if (!shouldUseProxy()) {
    return fetchRealtimeDirect(unique);
  }

  const url = new URL("/stocks/realtime", API_URL);
  url.searchParams.set("items", unique.join(","));
  return readApiResponse<RealtimeSnapshot[]>(await fetch(url));
}
