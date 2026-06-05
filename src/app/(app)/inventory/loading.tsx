import { TableSkeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return <TableSkeleton rows={8} cols={5} />;
}
