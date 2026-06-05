import { TableSkeleton } from "@/components/ui/skeleton";

export default function ClientsLoading() {
  return <TableSkeleton rows={8} cols={5} />;
}
