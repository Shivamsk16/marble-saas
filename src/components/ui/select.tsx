import { cn } from "@/lib/utils";
import { type SelectHTMLAttributes, forwardRef } from "react";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3",
      "text-[var(--text-sm)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
