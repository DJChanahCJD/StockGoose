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

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** 播放简短提醒提示音 */
function playAlertSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // 浏览器可能限制音频播放
  }
}

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
      playAlertSound();
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
