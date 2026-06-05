import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

const variants: Record<BadgeVariant, string> = {
  default: "bg-[var(--accent-subtle)] text-[var(--accent)]",
  success: "bg-[var(--success-subtle)] text-[var(--success)]",
  warning: "bg-[var(--warning-subtle)] text-[var(--warning)]",
  danger: "bg-[var(--danger-subtle)] text-[var(--danger)]",
  info: "bg-[var(--info-subtle)] text-[var(--info)]",
  neutral: "bg-[var(--surface-2)] text-[var(--text-muted)]",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-full)] px-2 py-0.5 text-[var(--text-xs)] font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

const statusMap: Record<string, BadgeVariant> = {
  in_stock: "success",
  in_cutting: "info",
  cut: "info",
  sold: "neutral",
  damaged: "danger",
  present: "success",
  absent: "danger",
  half_day: "warning",
  leave: "neutral",
  not_started: "neutral",
  in_progress: "info",
  done: "success",
  blocked: "danger",
  unpaid: "danger",
  partial: "warning",
  paid: "success",
  active: "success",
  idle: "neutral",
  cutting: "info",
  maintenance: "warning",
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export function StatusChip({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const label = status.replace(/_/g, " ");
  const variant = statusMap[status] ?? "neutral";
  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {label}
    </Badge>
  );
}
