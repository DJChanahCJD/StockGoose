import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type {
  RealtimeSnapshot,
  StockQuote,
  StockSearchItem,
  StockTrendPoint,
} from "@shared/types";
import { ok, fail } from "@utils/response";
import { getFromCache, putToCache } from "@utils/cache";
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

type QuoteFetchResult = {
  secid: string;
  quote: StockQuote | null;
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

/** EastMoney 市场码 → qt.gtimg.cn 前缀 */
const MARKET_TO_QT_PREFIX: Record<string, string> = {
  "0": "sz",
  "1": "sh",
  "105": "us",
  "116": "hk",
};

/** qt.gtimg.cn 前缀 → EastMoney 市场码 */
const QT_PREFIX_TO_MARKET: Record<string, string> = {
  sz: "0",
  sh: "1",
  hk: "116",
  us: "105",
};

/** null 安全的数字解析 */
function parseNum(val: string | undefined): number | null {
  if (!val || val === "") return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

/** EastMoney secid → qt.gtimg.cn 代码 (如 0.000858 → sz000858) */
function toQtCode(secid: string): string | null {
  const [market, code] = secid.split(".");
  const prefix = MARKET_TO_QT_PREFIX[market];
  if (!prefix || !code) return null;
  return `${prefix}${code}`;
}

/**
 * 解析 qt.gtimg.cn 返回的单行数据。
 * 响应格式: v_sz000858="51~五粮液~000858~27.78~..."
 */
function parseRealtimeLine(line: string): RealtimeSnapshot | null {
  const match = line.match(/^v_(\w+)="(.+)"\s*;?\s*$/);
  if (!match) return null;

  const qtCode = match[1];
  const fields = match[2].split("~");
  const qtPrefix = qtCode.match(/^[a-z]+/)?.[0] ?? "";
  const rawCode = fields[2];
  const code = qtPrefix === "us" ? rawCode.replace(/\.[A-Z]+$/, "") : rawCode;
  const name = fields[1];
  const market = QT_PREFIX_TO_MARKET[qtPrefix] ?? "";
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

/**
 * 根据 secid 拉取东方财富分时数据。
 */
async function fetchTrendData(
  secid: string,
  days: number
): Promise<TrendsApiData> {
  const cacheRequest = new Request(
    `https://stockgoose.local/stocks/trends?secid=${encodeURIComponent(secid)}&days=${days}`
  );
  const cached = await getFromCache(cacheRequest);
  if (cached) {
    const cachedBody = (await cached.json()) as TrendsApiResponse;
    if (cachedBody.rc === 0 && cachedBody.data) {
      return cachedBody.data;
    }
  }

  const url = new URL("https://push2.eastmoney.com/api/qt/stock/trends2/get");
  url.searchParams.set("secid", secid);
  url.searchParams.set("fields1", "f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13");
  url.searchParams.set("fields2", "f51,f53,f56,f58");
  url.searchParams.set("iscr", "0");
  url.searchParams.set("iscca", "0");
  url.searchParams.set("ndays", String(days));

  let response: Response | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await proxyGet(url.toString());
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
  }

  if (!response) {
    throw lastError instanceof Error
      ? lastError
      : new Error("Eastmoney request failed");
  }

  if (!response.ok) {
    throw new Error(`Eastmoney responded with ${response.status}`);
  }

  const body = (await response.json()) as TrendsApiResponse;
  if (body.rc !== 0 || !body.data) {
    throw new Error("Eastmoney returned an invalid trends payload");
  }

  await putToCache(
    cacheRequest,
    new Response(JSON.stringify(body), {
      headers: {
        "Content-Type": "application/json",
      },
    }),
    "stockQuote"
  );

  return body.data;
}

/**
 * 小并发抓取自选行情，降低上游瞬时压力。
 */
async function fetchQuotesWithLimit(
  secids: string[]
): Promise<QuoteFetchResult[]> {
  const queue = [...secids];
  const results: QuoteFetchResult[] = [];
  const concurrency = Math.min(3, queue.length);

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const secid = queue.shift();
      if (!secid) continue;

      try {
        const data = await fetchTrendData(secid, 1);
        results.push({ secid, quote: buildQuote(secid, data) });
      } catch (error) {
        console.error("Quote fetch failed:", secid, error);
        results.push({ secid, quote: null });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
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
    const fetched = await fetchQuotesWithLimit(secids);
    const quotes = fetched.flatMap((item) => (item.quote ? [item.quote] : []));
    return ok(c, quotes);
  } catch (error) {
    console.error("Stock quotes error:", error);
    return fail(c, "自选行情获取失败", 502);
  }
});

stockRoutes.get("/realtime", zValidator("query", quotesSchema), async (c) => {
  const { items } = c.req.valid("query");
  const secids = Array.from(
    new Set(
      items
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 24);

  const qtCodes = secids
    .map(toQtCode)
    .filter((code): code is string => code !== null);
  console.log("[realtime] input secids:", secids, "-> qtCodes:", qtCodes);
  if (!qtCodes.length) return fail(c, "无有效股票代码", 400);

  const cacheRequest = new Request(
    `https://stockgoose.local/stocks/realtime?items=${encodeURIComponent(qtCodes.join(","))}`
  );
  const cached = await getFromCache(cacheRequest);
  if (cached) {
    return ok(c, (await cached.json()) as RealtimeSnapshot[]);
  }

  try {
    const url = `http://qt.gtimg.cn/q=${qtCodes.join(",")}`;
    const response = await proxyGet(url);
    console.log("[realtime] proxyGet status:", response.status);
    if (!response.ok)
      return fail(c, `腾讯行情响应异常: ${response.status}`, 502);

    const buffer = await response.arrayBuffer();
    const text = new TextDecoder("gbk").decode(buffer);
    console.log(
      "[realtime] decoded body length:",
      text.length,
      "preview:",
      text.slice(0, 500)
    );

    const snapshots = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseRealtimeLine)
      .filter((s): s is RealtimeSnapshot => s !== null);

    console.log("[realtime] parsed snapshot count:", snapshots.length);

    if (snapshots.length > 0) {
      await putToCache(
        cacheRequest,
        new Response(JSON.stringify(snapshots), {
          headers: { "Content-Type": "application/json" },
        }),
        "stockRealtime"
      );
    }

    return ok(c, snapshots);
  } catch (error) {
    console.error("Realtime quote error:", error);
    return fail(c, "实时行情获取失败", 502);
  }
});
