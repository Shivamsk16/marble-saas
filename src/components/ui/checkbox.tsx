import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

export const Checkbox = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      "h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] accent-[var(--accent)]",
      "focus:ring-2 focus:ring-[var(--accent-subtle)] cursor-pointer",
      className
    )}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";
