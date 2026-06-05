import Link from "next/link";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { Button } from "./button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionHref,
  actionLabel,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: () => void;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-[var(--radius-lg)] bg-[var(--surface-2)] p-4">
          <Icon className="h-8 w-8 text-[var(--text-muted)]" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-h3 text-[var(--text)] mb-1">{title}</h3>
      {description && (
        <p className="text-[var(--text-sm)] text-[var(--text-muted)] max-w-sm mb-6">
          {description}
        </p>
      )}
      {actionHref && actionLabel && (
        <Link href={actionHref}>
          <Button>{actionLabel}</Button>
        </Link>
      )}
      {!actionHref && action && actionLabel && (
        <Button onClick={action}>{actionLabel}</Button>
      )}
    </div>
  );
}
