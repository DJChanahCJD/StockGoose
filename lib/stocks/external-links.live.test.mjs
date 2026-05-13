import assert from "node:assert/strict";
import test from "node:test";

import { generateExternalLinks } from "./external-links.ts";

const CHECK_TIMEOUT_MS = 8_000;
const CASES = [
  { code: "600519", market: "1" },
  { code: "000858", market: "0" },
  { code: "01810", market: "116" },
  { code: "AAPL", market: "105" },
  { code: "NDX100", market: "100" },
];

/**
 * 请求外链并返回外站当前响应情况。
 */
async function checkUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    return {
      ok: response.status < 500,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

test("generated external links are reachable right now", async () => {
  const links = CASES.flatMap(({ code, market }) =>
    generateExternalLinks(code, market).map((link) => ({
      code,
      market,
      ...link,
    }))
  );

  const results = await Promise.all(
    links.map(async (link) => ({
      ...link,
      ...(await checkUrl(link.url)),
    }))
  );
  const failures = results.filter((result) => !result.ok);

  assert.deepEqual(
    failures.map((failure) => ({
      code: failure.code,
      market: failure.market,
      name: failure.name,
      url: failure.url,
      status: failure.status,
      statusText: failure.statusText,
    })),
    []
  );
});
