import type { AlertRule, StockQuote } from "@/lib/stocks/types";
import { ALERT_LABELS, isAlertTriggered } from "./alert-rules";
import type { AlertNotificationPayload, Notifier } from "./notifier";
import type { PlatformAdapter } from "./scheduler-platform";

export const DEFAULT_ACTIVE_INTERVAL_MS = 5000;
export const DEFAULT_IDLE_INTERVAL_MS = 60000;
export const DEFAULT_UNCHANGED_THRESHOLD = 6;

type AlertSchedulerOptions = {
  getAlerts: () => AlertRule[];
  getQuotes: () => Record<string, StockQuote>;
  refresh: () => Promise<void>;
  notifier: Notifier;
  onLocalNotify: (message: string) => void;
  platform: PlatformAdapter;
  activeIntervalMs?: number;
  idleIntervalMs?: number;
  unchangedThreshold?: number;
};

type ResolvedAlertSchedulerOptions = Required<AlertSchedulerOptions>;

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

/** 统一调度全自选实时刷新、静默退避和提醒评估。 */
export class AlertScheduler {
  private readonly options: ResolvedAlertSchedulerOptions;
  private readonly ruleStates = new Map<string, boolean>();
  private timer: number | null = null;
  private running = false;
  private lastSignature: string | null = null;
  private unchangedTicks = 0;
  private currentIntervalMs: number;
  private unsubscribeForeground: (() => void) | null = null;

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

  /** 启动全局刷新调度器并监听平台前台/后台事件。 */
  start(): void {
    if (this.running) return;
    this.running = true;

    this.unsubscribeForeground = this.options.platform.onForegroundChange(
      (foreground) => {
        if (!this.running) return;
        if (foreground) {
          this.currentIntervalMs = this.options.activeIntervalMs;
          void this.tick();
        } else {
          this.clearTimer();
        }
      }
    );

    if (this.options.platform.isForeground()) {
      void this.tick();
    }
  }

  /** 停止调度器并释放定时器与平台事件监听。 */
  stop(): void {
    this.running = false;
    this.clearTimer();
    this.unsubscribeForeground?.();
    this.unsubscribeForeground = null;
  }

  /** 刷新全自选实时行情，按数据变化调整下次刷新间隔。 */
  async tick(): Promise<void> {
    if (!this.running || !this.options.platform.isForeground()) return;
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

  /** 清理已删除规则的触发状态并通知新触发规则。 */
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

  /** 将触发的规则投递到系统通知和站内通知。 */
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

  /** 根据行情签名是否连续不变，切换活跃刷新与低频刷新间隔。 */
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

  /** 安排下一次刷新，不在前台时不创建定时器。 */
  private scheduleNextTick(): void {
    if (!this.running || !this.options.platform.isForeground()) return;
    this.timer = window.setTimeout(() => {
      void this.tick();
    }, this.currentIntervalMs);
  }

  /** 清理当前等待中的刷新定时器。 */
  private clearTimer(): void {
    if (this.timer === null) return;
    window.clearTimeout(this.timer);
    this.timer = null;
  }
}
