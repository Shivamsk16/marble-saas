import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  filters,
  className,
  sticky,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-6",
        sticky && "sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-[var(--background)]/95 backdrop-blur-sm border-b border-[var(--border-subtle)] mb-6",
        className
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-[var(--text-xs)] text-[var(--text-muted)] mb-2" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-[var(--text)]">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--text)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-[var(--text)]">{title}</h1>
          {description && (
            <p className="text-[var(--text-sm)] text-[var(--text-muted)] mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {filters && <div className="mt-4 flex flex-wrap items-center gap-2">{filters}</div>}
    </div>
  );
}
