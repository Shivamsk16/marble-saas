import { cn } from "@/lib/utils";
import { type SelectHTMLAttributes, forwardRef } from "react";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
>(({ className, error, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full h-10 rounded-[var(--radius-md)] border bg-[var(--surface)] px-3",
      "text-[var(--text-sm)] outline-none transition-colors",
      "border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]",
      error && "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger-subtle)]",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
