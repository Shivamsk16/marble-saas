"use client";

import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { DropdownMenu } from "./dropdown-menu";
import { EmptyState } from "./empty-state";
import { Input } from "./input";
import { SegmentedControl } from "./tabs";
import { TableSkeleton } from "./skeleton";
import { type LucideIcon } from "lucide-react";

export type Column<T> = {
  id: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  filterValue?: (row: T) => string;
  hidden?: boolean;
  className?: string;
};

export function DataTable<T extends { id: string }>({
  data,
  columns: initialColumns,
  loading,
  searchPlaceholder = "Search…",
  emptyIcon,
  emptyTitle = "No data",
  emptyDescription,
  emptyActionHref,
  emptyActionLabel,
  emptyActionOnClick,
  bulkActions,
  rowActions,
  onExport,
  pageSize: defaultPageSize = 20,
  density: defaultDensity = "comfortable",
}: {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
  emptyActionOnClick?: () => void;
  bulkActions?: { label: string; onClick: (ids: string[]) => void; danger?: boolean }[];
  rowActions?: (row: T) => { label: string; onClick?: () => void; href?: string; danger?: boolean }[];
  onExport?: (rows: T[]) => void;
  pageSize?: number;
  density?: "compact" | "comfortable";
}) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState(defaultDensity);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const columns = useMemo(
    () => initialColumns.filter((c) => !c.hidden && !hiddenCols.has(c.id)),
    [initialColumns, hiddenCols]
  );

  const filtered = useMemo(() => {
    let rows = [...data];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        initialColumns.some((col) => {
          const fv = col.filterValue?.(row) ?? String(col.accessor(row) ?? "");
          return fv.toLowerCase().includes(q);
        })
      );
    }
    if (sortCol) {
      const col = initialColumns.find((c) => c.id === sortCol);
      if (col?.sortValue) {
        rows.sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }
    return rows;
  }, [data, search, sortCol, sortDir, initialColumns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = useCallback((colId: string) => {
    if (sortCol === colId) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(colId);
      setSortDir("asc");
    }
  }, [sortCol]);

  const toggleAll = useCallback(() => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((r) => r.id)));
  }, [paged, selected.size]);

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (loading) return <TableSkeleton />;

  return (
    <div data-density={density} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/50">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-subtle)]" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder={searchPlaceholder}
            className="pl-9"
            aria-label="Search table"
          />
        </div>
        <SegmentedControl
          options={[
            { value: "comfortable", label: "Comfort" },
            { value: "compact", label: "Compact" },
          ]}
          value={density}
          onChange={(v) => setDensity(v as "compact" | "comfortable")}
        />
        <DropdownMenu
          trigger={
            <Button variant="outline" size="sm">
              <Columns3 className="h-4 w-4" />
            </Button>
          }
          items={initialColumns.map((col) => ({
            label: hiddenCols.has(col.id) ? `Show ${col.header}` : `Hide ${col.header}`,
            onClick: () =>
              setHiddenCols((prev) => {
                const next = new Set(prev);
                if (next.has(col.id)) next.delete(col.id);
                else next.add(col.id);
                return next;
              }),
          }))}
        />
        {onExport && (
          <Button variant="outline" size="sm" onClick={() => onExport(filtered)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </div>

      {selected.size > 0 && bulkActions && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--accent-subtle)] border-b border-[var(--border-subtle)]">
          <span className="text-[var(--text-sm)] font-medium">{selected.size} selected</span>
          {bulkActions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.danger ? "danger" : "secondary"}
              onClick={() => action.onClick([...selected])}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[var(--text-sm)]">
          <thead className="sticky top-0 z-10 bg-[var(--surface-2)]">
            <tr className="border-b border-[var(--border-subtle)]">
              {bulkActions && (
                <th className="w-10 p-3">
                  <Checkbox
                    checked={paged.length > 0 && selected.size === paged.length}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn("p-3 text-left font-medium text-[var(--text-muted)]", col.className)}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-[var(--text)]"
                      onClick={() => toggleSort(col.id)}
                    >
                      {col.header}
                      {sortCol === col.id ? (
                        sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
              {rowActions && <th className="w-10 p-3" />}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (bulkActions ? 1 : 0) + (rowActions ? 1 : 0)}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    actionHref={emptyActionHref}
                    action={emptyActionOnClick}
                    actionLabel={emptyActionLabel}
                  />
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-2)]/50 data-row",
                    selected.has(row.id) && "bg-[var(--accent-subtle)]/30"
                  )}
                >
                  {bulkActions && (
                    <td className="p-3">
                      <Checkbox
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.id} className={cn("p-3", col.className)}>
                      {col.accessor(row)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="p-3">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Row actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                        items={rowActions(row)}
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border-subtle)] text-[var(--text-sm)] text-[var(--text-muted)]">
        <span>
          {filtered.length === 0 ? "0" : page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            className="h-8 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-[var(--text-sm)]"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
          <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="tabular-nums">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function exportToCsv<T>(
  rows: T[],
  columns: { header: string; value: (row: T) => string }[],
  filename = "export.csv"
) {
  const header = columns.map((c) => c.header).join(",");
  const body = rows
    .map((row) =>
      columns.map((c) => `"${String(c.value(row)).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
