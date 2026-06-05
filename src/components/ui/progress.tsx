import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  showLabel,
}: {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between text-[var(--text-xs)] text-[var(--text-muted)] mb-1">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
      )}
      <div
        className="h-2 w-full rounded-[var(--radius-full)] bg-[var(--surface-3)] overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-[var(--radius-full)] bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
