import type { AlertRule, StockQuote } from "@/lib/stocks/types";
import { ALERT_LABELS, isAlertTriggered } from "./alert-rules";
import type { AlertNotificationPayload, Notifier } from "./notifier";

export const DEFAULT_ACTIVE_INTERVAL_MS = 5000; // 活跃期 5 秒刷新一次
export const DEFAULT_IDLE_INTERVAL_MS = 60000; // 静默期 60 秒刷新一次
export const DEFAULT_UNCHANGED_THRESHOLD = 6; // 6 次内无变化，认为是静默退避

type AlertSchedulerOptions = {
  getAlerts: () => AlertRule[];
  getQuotes: () => Record<string, StockQuote>;
  refresh: () => Promise<void>;
  notifier: Notifier;
  onLocalNotify: (message: string) => void;
  activeIntervalMs?: number;
  idleIntervalMs?: number;
  unchangedThreshold?: number;
};

type ResolvedAlertSchedulerOptions = Required<AlertSchedulerOptions>;

/**
 * 按实时行情生成稳定签名，用于判断是否进入低频刷新。
 */
function buildQuotesSignature(quotes: Record<string, StockQuote>): string {
  return Object.values(quotes)
    .map((quote) => ({
      secid: quote.secid,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      updatedAt: quote.updatedAt,
    }))
    .sort((a, b) => a.secid.localeCompare(b.secid))
    .map(
      (quote) =>
        `${quote.secid}:${quote.price ?? ""}:${quote.change ?? ""}:${quote.changePercent ?? ""}:${quote.updatedAt ?? ""}`
    )
    .join("|");
}

/**
 * 统一调度全自选实时刷新、静默退避和提醒评估。
 */
export class AlertScheduler {
  private readonly options: ResolvedAlertSchedulerOptions;
  private readonly ruleStates = new Map<string, boolean>();
  private timer: number | null = null;
  private running = false;
  private lastSignature: string | null = null;
  private unchangedTicks = 0;
  private currentIntervalMs: number;
  constructor(options: AlertSchedulerOptions) {
    this.options = {
      ...options,
      activeIntervalMs: options.activeIntervalMs ?? DEFAULT_ACTIVE_INTERVAL_MS,
      idleIntervalMs: options.idleIntervalMs ?? DEFAULT_IDLE_INTERVAL_MS,
      unchangedThreshold:
        options.unchangedThreshold ?? DEFAULT_UNCHANGED_THRESHOLD,
    };
    this.currentIntervalMs = this.options.activeIntervalMs;
  }

  /**
   * 启动全局刷新调度器并监听页面可见性。
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    if (document.visibilityState === "visible") {
      void this.tick();
    }
  }

  /**
   * 停止调度器并释放定时器与页面可见性监听。
   */
  stop(): void {
    this.running = false;
    this.clearTimer();
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
  }

  /**
   * 刷新全自选实时行情，按数据变化调整下次刷新间隔。
   */
  async tick(): Promise<void> {
    if (!this.running || document.visibilityState !== "visible") return;
    this.clearTimer();

    try {
      await this.options.refresh();
      this.updateBackoff();
      this.evaluate();
    } catch (error) {
      console.error("[alert-scheduler] tick failed:", error);
    } finally {
      this.scheduleNextTick();
    }
  }

  /**
   * 清理已删除规则的触发状态并通知新触发规则。
   */
  private evaluate(): void {
    const alerts = this.options.getAlerts();
    const quotes = this.options.getQuotes();
    const activeRuleIds = new Set(alerts.map((rule) => rule.id));

    for (const ruleId of this.ruleStates.keys()) {
      if (!activeRuleIds.has(ruleId)) {
        this.ruleStates.delete(ruleId);
      }
    }

    for (const rule of alerts) {
      const quote = quotes[rule.secid];
      if (!quote) continue;

      const triggered = isAlertTriggered(rule, quote);
      const wasTriggered = this.ruleStates.get(rule.id) ?? false;
      this.ruleStates.set(rule.id, triggered);

      if (triggered && !wasTriggered) {
        this.send(rule, quote).catch((e) =>
          console.error("[alert-scheduler] send failed:", e)
        );
      }
    }
  }

  /**
   * 将触发的规则投递到系统通知和站内通知。
   */
  private async send(rule: AlertRule, quote: StockQuote): Promise<void> {
    const label = ALERT_LABELS[rule.type];
    const suffix = rule.type.includes("CHANGE") ? "%" : "";
    const title = `${quote.name || quote.code}`;
    const body = `${label} ${rule.threshold}${suffix}`;
    const payload: AlertNotificationPayload = {
      id: rule.id,
      title,
      body,
    };

    await this.options.notifier.notify(payload);
    this.options.onLocalNotify(`${title}：${body}`);
  }

  /**
   * 根据行情签名是否连续不变，切换 5 秒活跃刷新与 60 秒低频刷新。
   */
  private updateBackoff(): void {
    const signature = buildQuotesSignature(this.options.getQuotes());

    if (signature && signature === this.lastSignature) {
      this.unchangedTicks += 1;
    } else {
      this.unchangedTicks = 0;
      this.currentIntervalMs = this.options.activeIntervalMs;
    }

    this.lastSignature = signature;
    if (this.unchangedTicks >= this.options.unchangedThreshold) {
      this.currentIntervalMs = this.options.idleIntervalMs;
    }
  }

  /**
   * 安排下一次刷新，页面不可见时不创建定时器。
   */
  private scheduleNextTick(): void {
    if (!this.running || document.visibilityState !== "visible") return;
    this.timer = window.setTimeout(() => {
      void this.tick();
    }, this.currentIntervalMs);
  }

  /**
   * 清理当前等待中的刷新定时器。
   */
  private clearTimer(): void {
    if (this.timer === null) return;
    window.clearTimeout(this.timer);
    this.timer = null;
  }

  /**
   * 页面回到前台时立即刷新，切到后台时暂停定时器。
   */
  private handleVisibilityChange = (): void => {
    if (!this.running) return;
    if (document.visibilityState === "visible") {
      this.currentIntervalMs = this.options.activeIntervalMs;
      void this.tick();
      return;
    }

    this.clearTimer();
  };
}
