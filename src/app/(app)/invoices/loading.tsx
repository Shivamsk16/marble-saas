import { TableSkeleton } from "@/components/ui/skeleton";

export default function InvoicesLoading() {
  return <TableSkeleton rows={8} cols={6} />;
}
