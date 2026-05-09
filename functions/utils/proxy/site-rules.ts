// funcitons/utils/proxy/site-rules.ts
// 站点规则配置
export type SiteRule = {
  match: (url: URL) => boolean;
  headers: Record<string, string>;
};

const DEFAULT_UA = "Mozilla/5.0 (compatible; stockgoose Proxy/1.0)";

export const SITE_RULES: SiteRule[] = [
  {
    // 东方财富行情接口规则
    match: (u) => u.hostname.includes("eastmoney.com"),
    headers: {
      Referer: "https://quote.eastmoney.com/",
      Origin: "https://quote.eastmoney.com",
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  },
];

/**
 * 根据 URL 获取对应站点的请求头
 */
export function resolveSiteHeaders(url: URL) {
  const rule = SITE_RULES.find((r) => r.match(url));
  return {
    "User-Agent": DEFAULT_UA,
    ...(rule?.headers ?? {}),
  };
}
