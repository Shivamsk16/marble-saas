import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-3xl space-y-6 animate-pulse">
      <Skeleton className="h-8 w-full max-w-md" />
      <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}
