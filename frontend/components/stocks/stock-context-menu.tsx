"use client";

import { Bell, Edit3, FileText, Trash2 } from "lucide-react";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

type StockContextMenuContentProps = {
  onAlert: () => void;
  onDelete: () => void;
};

/**
 * 自选标的共用的右键菜单项（编辑/详情/提醒/删除）。
 */
export function StockContextMenuContent({
  onAlert,
  onDelete,
}: StockContextMenuContentProps) {
  return (
    <ContextMenuContent>
      <ContextMenuItem disabled>
        <Edit3 className="h-4 w-4" />
        编辑（待实现）
      </ContextMenuItem>
      <ContextMenuItem onSelect={onAlert}>
        <Bell className="h-4 w-4" />
        涨跌提醒
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onSelect={onDelete}>
        <Trash2 className="h-4 w-4" />
        删除
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
