import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card } from "./card";
import { Sparkline } from "./charts";

export function KpiCard({
  label,
  value,
  href,
  trend,
  trendLabel,
  sparklineData,
  className,
}: {
  label: string;
  value: string | number;
  href?: string;
  trend?: number;
  trendLabel?: string;
  sparklineData?: number[];
  className?: string;
}) {
  const content = (
    <Card
      className={cn(
        "p-4 transition-colors",
        href && "hover:border-[var(--accent)]/30 hover:bg-[var(--surface-2)]/50",
        className
      )}
    >
      <p className="text-[var(--text-sm)] text-[var(--text-muted)] font-medium mb-1">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-h2 text-[var(--text)] tabular-nums">{value}</p>
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline data={sparklineData} width={64} height={24} />
        )}
      </div>
      {(trend !== undefined || trendLabel) && (
        <div className="flex items-center gap-1 mt-2 text-[var(--text-xs)]">
          {trend !== undefined && (
            <>
              {trend > 0 ? (
                <ArrowUp className="h-3 w-3 text-[var(--success)]" />
              ) : trend < 0 ? (
                <ArrowDown className="h-3 w-3 text-[var(--danger)]" />
              ) : (
                <Minus className="h-3 w-3 text-[var(--text-muted)]" />
              )}
              <span
                className={cn(
                  trend > 0 && "text-[var(--success)]",
                  trend < 0 && "text-[var(--danger)]",
                  trend === 0 && "text-[var(--text-muted)]"
                )}
              >
                {trend > 0 ? "+" : ""}
                {trend}%
              </span>
            </>
          )}
          {trendLabel && <span className="text-[var(--text-muted)]">{trendLabel}</span>}
        </div>
      )}
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
