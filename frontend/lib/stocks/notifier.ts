export type NotifyPermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

export type AlertNotificationPayload = {
  id: string;
  title: string;
  body: string;
};

export type Notifier = {
  getPermissionState: () => NotifyPermissionState;
  requestPermission: () => Promise<NotifyPermissionState>;
  notify: (payload: AlertNotificationPayload) => Promise<void>;
};

/**
 * 将浏览器 Notification 权限状态归一化为应用内部状态。
 */
function normalizePermission(
  permission: NotificationPermission
): NotifyPermissionState {
  return permission === "default" ? "prompt" : permission;
}

/**
 * 创建 Web Notification 通知适配器。
 */
function createWebNotifier(): Notifier {
  return {
    getPermissionState() {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
      }
      return normalizePermission(Notification.permission);
    },

    async requestPermission() {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
      }
      return normalizePermission(await Notification.requestPermission());
    },

    async notify(payload) {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      new Notification(payload.title, {
        body: payload.body,
        tag: payload.id,
      });
    },
  };
}

/**
 * 按运行平台创建提醒通知适配器。
 */
export function createNotifier(platform: "web" | "tauri" = "web"): Notifier {
  if (platform === "tauri") {
    return createWebNotifier();
  }

  return createWebNotifier();
}
