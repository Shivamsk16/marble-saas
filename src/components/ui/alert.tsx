import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Alert({
  variant = "danger",
  children,
  onRetry,
  retryLabel = "Retry",
  className,
}: {
  variant?: "danger" | "warning" | "info";
  children: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[var(--radius-md)] border px-4 py-3 text-[var(--text-sm)] mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
        variant === "danger" && "bg-[var(--danger-subtle)] border-[var(--danger)]/20 text-[var(--danger)]",
        variant === "warning" && "bg-[var(--warning-subtle)] border-[var(--warning)]/20 text-[var(--warning)]",
        variant === "info" && "bg-[var(--info-subtle)] border-[var(--info)]/20 text-[var(--info)]",
        className
      )}
    >
      <span>{children}</span>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry} className="shrink-0">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
