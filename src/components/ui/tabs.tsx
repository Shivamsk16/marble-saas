"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export function Tabs({
  tabs,
  defaultTab,
  onChange,
  className,
}: {
  tabs: { id: string; label: string }[];
  defaultTab?: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  function select(id: string) {
    setActive(id);
    onChange?.(id);
  }

  return (
    <div className={cn("flex gap-1 border-b border-[var(--border-subtle)]", className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => select(tab.id)}
          className={cn(
            "px-4 py-2.5 text-[var(--text-sm)] font-medium transition-colors -mb-px",
            active === tab.id
              ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-0.5",
        className
      )}
      role="group"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-[var(--text-sm)] font-medium rounded-[var(--radius-sm)] transition-colors",
            value === opt.value
              ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-sm)]"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
