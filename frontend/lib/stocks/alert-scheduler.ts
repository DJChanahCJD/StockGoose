import type { AlertRule, StockQuote } from "@shared/types";
import { ALERT_LABELS, isAlertTriggered } from "./alert-rules";
import type { AlertNotificationPayload, Notifier } from "./notifier";

type AlertSchedulerOptions = {
  getAlerts: () => AlertRule[];
  getQuotes: () => Record<string, StockQuote>;
  refresh: () => Promise<void>;
  notifier: Notifier;
  onLocalNotify: (message: string) => void;
  intervalMs?: number;
};

/**
 * 按固定间隔刷新行情、评估提醒规则并分发通知。
 */
export class AlertScheduler {
  private readonly options: Required<AlertSchedulerOptions>;
  private readonly ruleStates = new Map<string, boolean>();
  private timer: number | null = null;

  constructor(options: AlertSchedulerOptions) {
    this.options = {
      ...options,
      intervalMs: options.intervalMs ?? 5000,
    };
  }

  /**
   * 启动提醒调度器并立即执行一次评估。
   */
  start(): void {
    if (this.timer !== null) return;
    void this.tick();
    this.timer = window.setInterval(() => {
      void this.tick();
    }, this.options.intervalMs);
  }

  /**
   * 停止调度器并释放定时器。
   */
  stop(): void {
    if (this.timer === null) return;
    window.clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * 刷新行情后执行一次跨阈值提醒评估。
   */
  async tick(): Promise<void> {
    if (this.options.getAlerts().length === 0) return;

    try {
      await this.options.refresh();
      this.evaluate();
    } catch (error) {
      console.error("[alert-scheduler] tick failed:", error);
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
}
