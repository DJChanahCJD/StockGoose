"use client";

import { BellRing } from "lucide-react";

type NotificationStackProps = {
  notifications: { id: number; message: string }[];
};

/**
 * 渲染本地提醒触发后的临时通知。
 */
export function NotificationStack({ notifications }: NotificationStackProps) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-foreground text-background px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-right-4 fade-in"
        >
          <BellRing className="w-5 h-5 text-warning mt-0.5" />
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      ))}
    </div>
  );
}
