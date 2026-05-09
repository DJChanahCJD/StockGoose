export type RuntimePlatform = "web" | "tauri";

/**
 * 判断当前运行平台，用于选择网页代理或运行时直连。
 */
export function getRuntimePlatform(): RuntimePlatform {
  if (typeof window === "undefined") return "web";

  const hasTauri = "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
  if (hasTauri) return "tauri";

  return "web";
}

/**
 * 网页端需要代理以规避 CORS；Tauri 运行时优先直连源站。
 */
export function shouldUseProxy(): boolean {
  return getRuntimePlatform() === "web";
}
