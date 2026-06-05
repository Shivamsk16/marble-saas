import { TableSkeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return <TableSkeleton rows={8} cols={6} />;
}
