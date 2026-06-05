"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function DropdownMenu({
  trigger,
  items,
  align = "right",
  className,
}: {
  trigger: React.ReactNode;
  items: {
    label: string;
    onClick?: () => void;
    href?: string;
    danger?: boolean;
    disabled?: boolean;
  }[];
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 min-w-[160px] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface)] py-1 shadow-[var(--shadow-md)]",
            align === "right" ? "right-0" : "left-0"
          )}
          role="menu"
        >
          {items.map((item, i) => {
            const cls = cn(
              "block w-full text-left px-3 py-2 text-[var(--text-sm)] hover:bg-[var(--surface-2)]",
              item.danger && "text-[var(--danger)]",
              item.disabled && "opacity-50 pointer-events-none"
            );
            if (item.href) {
              return (
                <a key={i} href={item.href} className={cls} role="menuitem" onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              );
            }
            return (
              <button
                key={i}
                type="button"
                className={cls}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
