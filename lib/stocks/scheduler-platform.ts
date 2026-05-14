import { isTauri } from "./notifier";

/** 平台生命周期的前台/后台适配接口。 */
export interface PlatformAdapter {
  /** 当前是否在前台（可见且聚焦）。 */
  isForeground(): boolean;
  /** 注册前台/后台切换回调，返回取消注册函数。 */
  onForegroundChange(callback: (foreground: boolean) => void): () => void;
}

/** Web 平台适配器（基于 document.visibilitychange）。 */
function createWebAdapter(): PlatformAdapter {
  return {
    isForeground() {
      return document.visibilityState === "visible";
    },
    onForegroundChange(callback: (foreground: boolean) => void) {
      const handler = () => callback(document.visibilityState === "visible");
      document.addEventListener("visibilitychange", handler);
      return () => document.removeEventListener("visibilitychange", handler);
    },
  };
}

/** Tauri 桌面平台适配器（基于窗口焦点事件）。 */
function createTauriAdapter(): PlatformAdapter {
  let focused = true;

  // 懒加载 Tauri window 模块，所有方法共享同一个 promise
  const winModule = import("@tauri-apps/api/window");

  winModule.then(async ({ getCurrentWindow }) => {
    try {
      focused = await getCurrentWindow().isFocused();
    } catch {
      // 读取失败使用默认值
    }
  });

  return {
    isForeground() {
      return focused;
    },
    onForegroundChange(callback: (foreground: boolean) => void) {
      let cancelled = false;
      let unsub: (() => void) | null = null;

      winModule.then(async ({ getCurrentWindow }) => {
        if (cancelled) return;
        const win = getCurrentWindow();
        if (cancelled) return;
        unsub = await win.onFocusChanged((event) => {
          focused = event.payload;
          callback(focused);
        });
        if (cancelled) {
          unsub?.();
          unsub = null;
        }
      });

      return () => {
        cancelled = true;
        unsub?.();
      };
    },
  };
}

/** 在 Tauri 环境下检测是否为移动端（Android / iOS）。 */
function isTauriMobile(): boolean {
  return /android|iphone|ipad/i.test(navigator.userAgent);
}

/** 自动检测运行环境并创建对应的平台适配器。 */
export function createPlatformAdapter(): PlatformAdapter {
  if (isTauri() && !isTauriMobile()) {
    return createTauriAdapter();
  }
  // Web 适配器在 Tauri 移动端同样适用：
  // App 进入后台时 mobile WebView 会触发 visibilitychange
  return createWebAdapter();
}
