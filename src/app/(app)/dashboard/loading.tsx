import { KpiSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <div className="h-8 w-48 bg-[var(--surface-3)] rounded animate-pulse" />
        <div className="h-4 w-72 bg-[var(--surface-3)] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton rows={4} cols={3} />
    </div>
  );
}
