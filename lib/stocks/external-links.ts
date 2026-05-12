export type ExternalLink = {
  name: string;
  url: string;
};

type KnownMarket = "0" | "1" | "100" | "105" | "116";

const MARKET_MAP: Record<
  KnownMarket,
  { em: string; xq: string; sina: string }
> = {
  "0": { em: "sz", xq: "SZ", sina: "sz" }, // 深圳
  "1": { em: "sh", xq: "SH", sina: "sh" }, // 上海
  "100": { em: "gb", xq: "", sina: "" }, // 全球指数
  "105": { em: "us", xq: "", sina: "us" }, // 美股
  "116": { em: "hk", xq: "HK", sina: "hk" }, // 港股
  // TODO: itab 的 API 似乎有问题，返回恒生科技指数（HSTECH）的market为'124'
};

const XUEQIU_GLOBAL_INDEX_MAP: Record<string, string> = {
  IXIC: ".IXIC",
  NDX: ".NDX",
  NDX100: ".NDX",
};

/**
 * 判断 A 股代码是否应使用东方财富指数页面。
 */
function isCnIndex(code: string, market: string): boolean {
  return (
    (market === "1" && code.startsWith("000")) ||
    (market === "0" && code.startsWith("399"))
  );
}

/**
 * 生成东方财富外链，未知市场退回站内搜索。
 */
function buildEastMoneyUrl(code: string, market: string): string {
  if ((market === "0" || market === "1") && isCnIndex(code, market)) {
    return `https://quote.eastmoney.com/zs${code}.html`;
  }

  if (market === "0" || market === "1") {
    return `https://quote.eastmoney.com/${MARKET_MAP[market].em}${code}.html`;
  }

  if (market === "116") {
    return `https://quote.eastmoney.com/hk/${code}.html`;
  }

  if (market === "105") {
    return `https://quote.eastmoney.com/us/${code}.html`;
  }

  if (market === "100") {
    return `https://quote.eastmoney.com/gb/zs${code}.html`;
  }

  return `https://so.eastmoney.com/web/s?keyword=${encodeURIComponent(code)}`;
}

/**
 * 生成雪球外链，未知市场退回站内搜索。
 */
function buildXueqiuUrl(code: string, market: string): string {
  if (market === "105") {
    return `https://xueqiu.com/S/${code}`;
  }

  if (market === "100") {
    const xqCode = XUEQIU_GLOBAL_INDEX_MAP[code.toUpperCase()] ?? code;
    return `https://xueqiu.com/S/${xqCode}`;
  }

  const marketConfig = MARKET_MAP[market as KnownMarket];
  if (marketConfig?.xq) {
    return `https://xueqiu.com/S/${marketConfig.xq}${code}`;
  }

  return `https://xueqiu.com/k?q=${encodeURIComponent(code)}`;
}

/**
 * 生成同花顺外链，非直达市场退回问财搜索。
 */
function buildTonghuashunUrl(code: string, market: string): string {
  if (market === "0" || market === "1") {
    return `https://basic.10jqka.com.cn/${code}/`;
  }

  if (market === "116") {
    return `https://stockpage.10jqka.com.cn/${code}/`;
  }

  return `https://search.10jqka.com.cn/unifiedwap/home/index?w=${encodeURIComponent(code)}`;
}

/**
 * 生成新浪财经外链，非直达市场退回财经搜索。
 */
function buildSinaFinanceUrl(code: string, market: string): string {
  const marketConfig = MARKET_MAP[market as KnownMarket];

  if ((market === "0" || market === "1") && marketConfig) {
    return `https://finance.sina.com.cn/realstock/company/${marketConfig.sina}${code}/nc.shtml`;
  }

  if (market === "116") {
    return `https://stock.finance.sina.com.cn/hkstock/quotes/${code}.html`;
  }

  const searchParams = new URLSearchParams({
    country: "",
    q: code,
    name: "s",
    t: "keyword",
    c: "all",
    k: "s",
    range: "all",
    col: "1_7",
    from: "channel",
  });

  return `https://biz.finance.sina.com.cn/suggest/lookup_n.php?${searchParams.toString()}`;
}

/**
 * 生成腾讯财经外链，未知市场退回站内搜索。
 */
function buildTencentUrl(code: string, market: string): string {
  const prefixMap: Record<string, string> = {
    "0": "sz",   // 深圳
    "1": "sh",   // 上海
    "105": "us", // 美股
    "116": "hk", // 港股
  };

  const prefix = prefixMap[market];
  if (prefix) {
    return `https://gu.qq.com/${prefix}${code}`;
  }

  return `https://stockapp.finance.qq.com/mstats/`
  // 未知市场退回搜索
  // return `https://gu.qq.com/search?q=${encodeURIComponent(code)}`;
}

/**
 * 根据股票代码和市场生成外部网站链接。
 * @param code - 股票代码
 * @param market - 市场编码 ("0"=深圳, "1"=上海, "100"=全球指数, "105"=美股, "116"=港股)
 * @returns 外部链接列表
 */
export function generateExternalLinks(
  code: string,
  market: string
): ExternalLink[] {
  const links: ExternalLink[] = [
    {
      name: "东方财富",
      url: buildEastMoneyUrl(code, market),
    },
    {
      name: "雪球",
      url: buildXueqiuUrl(code, market),
    },
    {
      name: "腾讯",
      url: buildTencentUrl(code, market),
    },
    // TODO: 以下这两个数据源质量一般，考虑删除
    {
      name: "同花顺",
      url: buildTonghuashunUrl(code, market),
    },
    {
      name: "新浪财经",
      url: buildSinaFinanceUrl(code, market),
    },
  ];

  return links;
}
