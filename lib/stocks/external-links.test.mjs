import assert from "node:assert/strict";
import test from "node:test";

import { generateExternalLinks } from "./external-links.ts";

const LINK_NAMES = ["东方财富", "雪球", "腾讯", "同花顺", "新浪财经"];

/**
 * 将外链列表转为按名称索引的 URL 映射。
 */
function urlsByName(code, market) {
  const links = generateExternalLinks(code, market);

  assert.deepEqual(
    links.map((link) => link.name),
    LINK_NAMES
  );
  assert.equal(links.length, LINK_NAMES.length);

  return Object.fromEntries(links.map((link) => [link.name, link.url]));
}

test("generates direct Shanghai stock links", () => {
  assert.deepEqual(urlsByName("600519", "1"), {
    东方财富: "https://quote.eastmoney.com/sh600519.html",
    雪球: "https://xueqiu.com/S/SH600519",
    腾讯: "https://gu.qq.com/sh600519",
    同花顺: "https://stockpage.10jqka.com.cn/600519/",
    新浪财经:
      "https://finance.sina.com.cn/realstock/company/sh600519/nc.shtml",
  });
});

test("generates direct Shenzhen stock links", () => {
  assert.deepEqual(urlsByName("000858", "0"), {
    东方财富: "https://quote.eastmoney.com/sz000858.html",
    雪球: "https://xueqiu.com/S/SZ000858",
    腾讯: "https://gu.qq.com/sz000858",
    同花顺: "https://stockpage.10jqka.com.cn/000858/",
    新浪财经:
      "https://finance.sina.com.cn/realstock/company/sz000858/nc.shtml",
  });
});

test("uses EastMoney index pages for Chinese index codes", () => {
  assert.equal(
    urlsByName("000001", "1").东方财富,
    "https://quote.eastmoney.com/zs000001.html"
  );
  assert.equal(
    urlsByName("399001", "0").东方财富,
    "https://quote.eastmoney.com/zs399001.html"
  );
});

test("generates Hong Kong stock links", () => {
  assert.deepEqual(urlsByName("01810", "116"), {
    东方财富: "https://quote.eastmoney.com/hk/01810.html",
    雪球: "https://xueqiu.com/S/01810",
    腾讯: "https://gu.qq.com/hk01810",
    同花顺: "https://stockpage.10jqka.com.cn/01810/",
    新浪财经: "https://stock.finance.sina.com.cn/hkstock/quotes/01810.html",
  });
});

test("generates US stock links", () => {
  assert.deepEqual(urlsByName("AAPL", "105"), {
    东方财富: "https://quote.eastmoney.com/us/AAPL.html",
    雪球: "https://xueqiu.com/S/AAPL",
    腾讯: "https://gu.qq.com/usAAPL",
    同花顺: "https://www.10jqka.com.cn/",
    新浪财经:
      "https://biz.finance.sina.com.cn/suggest/lookup_n.php?country=&q=AAPL&name=s&t=keyword&c=all&k=s&range=all&col=1_7&from=channel",
  });
});

test("maps known global index aliases for Xueqiu", () => {
  assert.deepEqual(urlsByName("NDX100", "100"), {
    东方财富: "https://quote.eastmoney.com/gb/zsNDX100.html",
    雪球: "https://xueqiu.com/S/.NDX",
    腾讯: "https://stockapp.finance.qq.com/mstats/",
    同花顺: "https://www.10jqka.com.cn/",
    新浪财经:
      "https://biz.finance.sina.com.cn/suggest/lookup_n.php?country=&q=NDX100&name=s&t=keyword&c=all&k=s&range=all&col=1_7&from=channel",
  });
});

test("falls back to search URLs for unknown markets and encodes query text", () => {
  assert.deepEqual(urlsByName("ABC 123", "999"), {
    东方财富: "https://so.eastmoney.com/web/s?keyword=ABC%20123",
    雪球: "https://xueqiu.com/k?q=ABC%20123",
    腾讯: "https://stockapp.finance.qq.com/mstats/",
    同花顺: "https://www.10jqka.com.cn/",
    新浪财经:
      "https://biz.finance.sina.com.cn/suggest/lookup_n.php?country=&q=ABC+123&name=s&t=keyword&c=all&k=s&range=all&col=1_7&from=channel",
  });
});
