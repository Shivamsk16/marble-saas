import { cn } from "@/lib/utils";
import { type TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full min-h-[80px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2",
      "text-[var(--text-sm)] outline-none resize-y focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
