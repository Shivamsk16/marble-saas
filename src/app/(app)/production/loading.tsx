import { Skeleton } from "@/components/ui/skeleton";

export default function ProductionLoading() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-[var(--radius-lg)]" />
      ))}
    </div>
  );
}
