"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronRight, Clock, User } from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";

export type KanbanItem = {
  id: string;
  title: string;
  subtitle?: string;
  worker?: string;
  dueDate?: string;
  delayed?: boolean;
  priority?: "high" | "medium" | "low";
  meta?: string;
};

export type KanbanColumn = {
  id: string;
  title: string;
  items: KanbanItem[];
};

export function KanbanBoard({
  columns,
  onMove,
  onCardClick,
  className,
}: {
  columns: KanbanColumn[];
  onMove?: (itemId: string, fromCol: string, toCol: string) => void;
  onCardClick?: (item: KanbanItem, columnId: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4 -mx-1 px-1", className)}>
      {columns.map((col, colIndex) => (
        <KanbanColumnView
          key={col.id}
          column={col}
          onMoveNext={
            colIndex < columns.length - 1 && onMove
              ? (itemId) => onMove(itemId, col.id, columns[colIndex + 1].id)
              : undefined
          }
          onCardClick={onCardClick ? (item) => onCardClick(item, col.id) : undefined}
        />
      ))}
    </div>
  );
}

function KanbanColumnView({
  column,
  onMoveNext,
  onCardClick,
}: {
  column: KanbanColumn;
  onMoveNext?: (itemId: string) => void;
  onCardClick?: (item: KanbanItem) => void;
}) {
  return (
    <div className="flex flex-col w-[280px] shrink-0 rounded-[var(--radius-lg)] bg-[var(--surface-2)]/80 border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--border-subtle)]">
        <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text)]">{column.title}</h3>
        <span className="text-[var(--text-xs)] font-medium text-[var(--text-muted)] bg-[var(--surface)] px-2 py-0.5 rounded-[var(--radius-full)]">
          {column.items.length}
        </span>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto">
        {column.items.length === 0 ? (
          <p className="text-[var(--text-xs)] text-[var(--text-subtle)] text-center py-8">No items</p>
        ) : (
          column.items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              onMoveNext={onMoveNext ? () => onMoveNext(item.id) : undefined}
              onClick={onCardClick ? () => onCardClick(item) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  item,
  onMoveNext,
  onClick,
}: {
  item: KanbanItem;
  onMoveNext?: () => void;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)] transition-colors",
        item.delayed && "border-[var(--danger)]/40 bg-[var(--danger-subtle)]/20",
        onClick && "cursor-pointer hover:border-[var(--accent)]/30"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[var(--text-sm)] font-medium text-[var(--text)] leading-snug">{item.title}</p>
        {item.priority === "high" && <Badge variant="danger">High</Badge>}
        {item.delayed && <AlertTriangle className="h-4 w-4 text-[var(--danger)] shrink-0" />}
      </div>
      {item.subtitle && (
        <p className="text-[var(--text-xs)] text-[var(--text-muted)] mb-2">{item.subtitle}</p>
      )}
      <div className="flex flex-wrap gap-2 text-[var(--text-xs)] text-[var(--text-muted)]">
        {item.worker && (
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {item.worker}
          </span>
        )}
        {item.dueDate && (
          <span className={cn("inline-flex items-center gap-1", item.delayed && "text-[var(--danger)]")}>
            <Clock className="h-3 w-3" />
            {item.dueDate}
          </span>
        )}
      </div>
      {item.meta && <p className="text-[var(--text-xs)] text-[var(--text-subtle)] mt-2">{item.meta}</p>}
      {onMoveNext && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 justify-between"
          onClick={(e) => {
            e.stopPropagation();
            onMoveNext();
          }}
        >
          Move next
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export const PRODUCTION_STAGES = [
  { id: "new_order", label: "New Order" },
  { id: "design_approval", label: "Design Approval" },
  { id: "cutting", label: "Cutting" },
  { id: "polishing", label: "Polishing" },
  { id: "finishing", label: "Finishing" },
  { id: "quality_check", label: "Quality Check" },
  { id: "ready_for_dispatch", label: "Ready for Dispatch" },
  { id: "delivered", label: "Delivered" },
] as const;

export type ProductionStage = (typeof PRODUCTION_STAGES)[number]["id"];

export function stageProgress(stage: ProductionStage): number {
  const idx = PRODUCTION_STAGES.findIndex((s) => s.id === stage);
  return Math.round(((idx + 1) / PRODUCTION_STAGES.length) * 100);
}
