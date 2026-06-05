import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}
