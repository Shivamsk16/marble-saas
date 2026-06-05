import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full h-10 rounded-[var(--radius-md)] border bg-[var(--surface)] px-3 text-[var(--text-sm)]",
      "placeholder:text-[var(--text-subtle)] outline-none transition-colors",
      "border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]",
      error && "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger-subtle)]",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
