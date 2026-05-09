// functions/utils/cache.ts

/**
 * 缓存配置常量
 */
export const CACHE_CONFIG = {
  stockQuote: {
    maxAge: 15, // 15 秒
  },
  stockRealtime: {
    maxAge: 5, // 5 秒，实时快照刷新更快
  },
};

const cacheName = "stockgoose-cache";

/**
 * 基于请求 URL 创建 Cache API 的 GET 缓存键。
 */
export function createCacheKey(request: Request): Request {
  const url = new URL(request.url);
  // 只缓存 GET
  return new Request(url.toString(), {
    method: "GET",
  });
}

/**
 * 从 Cloudflare Cache API 读取响应缓存。
 */
export async function getFromCache(request: Request): Promise<Response | null> {
  const cache = await caches.open(cacheName);
  const key = createCacheKey(request);
  return (await cache.match(key)) ?? null;
}

/**
 * 将成功响应写入 Cloudflare Cache API。
 */
export async function putToCache(
  request: Request,
  response: Response,
  type: keyof typeof CACHE_CONFIG
) {
  if (!response.ok) return;

  const cache = await caches.open(cacheName);
  const key = createCacheKey(request);

  const maxAge = CACHE_CONFIG[type].maxAge;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${maxAge}`);
  const cachedResp = new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  await cache.put(key, cachedResp);
}

/**
 * 删除指定请求对应的缓存。
 */
export async function deleteCache(request: Request) {
  const cache = await caches.open(cacheName);
  const key = createCacheKey(request);
  await cache.delete(key);
}
